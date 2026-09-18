"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";

export async function addCapitalEntryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();

  const entryType = String(formData.get("entryType") ?? "");
  const amount = Number(formData.get("amount"));
  const entryDate = String(formData.get("entryDate") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (entryType !== "injection" && entryType !== "withdrawal") {
    return { error: "Invalid entry type." };
  }
  if (!(amount > 0)) {
    return { error: "Amount must be greater than zero." };
  }
  if (!entryDate) {
    return { error: "Date is required." };
  }

  const db = createAdminClient();
  const { error } = await db.from("capital_entries").insert({
    entry_type: entryType,
    amount,
    entry_date: entryDate,
    note,
    created_by: admin.id,
  });

  if (error) {
    return { error: "Could not save this capital entry. Please try again." };
  }

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    action: entryType === "injection" ? "capital_injected" : "capital_withdrawn",
    entity_type: "capital_entry",
    description: `${entryType === "injection" ? "Injected" : "Withdrew"} ₦${amount}${note ? `: ${note}` : ""}`,
  });

  revalidatePath("/admin/finances");
  revalidatePath("/admin");
  return { success: true, message: "Capital entry saved." };
}

export async function addExpenseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();

  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const expenseDate = String(formData.get("expenseDate") ?? "").trim();

  if (!(amount > 0)) {
    return { error: "Amount must be greater than zero." };
  }
  if (!category) {
    return { error: "Category is required." };
  }
  if (!expenseDate) {
    return { error: "Date is required." };
  }

  const db = createAdminClient();
  const { error } = await db.from("expenses").insert({
    amount,
    category,
    description,
    expense_date: expenseDate,
    created_by: admin.id,
  });

  if (error) {
    return { error: "Could not save this expense. Please try again." };
  }

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    action: "expense_recorded",
    entity_type: "expense",
    description: `Recorded expense of ₦${amount} (${category})${description ? `: ${description}` : ""}`,
  });

  revalidatePath("/admin/finances");
  revalidatePath("/admin");
  return { success: true, message: "Expense saved." };
}