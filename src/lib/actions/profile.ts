"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!fullName) {
    return { error: "Full name is required." };
  }
  if (fullName.length > 100) {
    return { error: "Full name is too long." };
  }

  const monthlyIncomeRaw = String(formData.get("monthlyIncome") ?? "").trim();
  const monthlyIncome = monthlyIncomeRaw ? Number(monthlyIncomeRaw) : null;
  if (monthlyIncomeRaw && (Number.isNaN(monthlyIncome) || (monthlyIncome as number) < 0)) {
    return { error: "Monthly income must be a valid positive number." };
  }

  const update = {
    full_name: fullName,
    phone: String(formData.get("phone") ?? "").trim() || null,
    date_of_birth: String(formData.get("dateOfBirth") ?? "").trim() || null,
    gender: String(formData.get("gender") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    employment_status: (String(formData.get("employmentStatus") ?? "").trim() || null) as
      | "employed"
      | "self_employed"
      | "business_owner"
      | "unemployed"
      | "student"
      | "retired"
      | null,
    employer_name: String(formData.get("employerName") ?? "").trim() || null,
    monthly_income: monthlyIncome,
    bank_name: String(formData.get("bankName") ?? "").trim() || null,
    account_name: String(formData.get("accountName") ?? "").trim() || null,
    account_number: String(formData.get("accountNumber") ?? "").trim() || null,
    emergency_contact_name: String(formData.get("emergencyContactName") ?? "").trim() || null,
    emergency_contact_phone: String(formData.get("emergencyContactPhone") ?? "").trim() || null,
    emergency_contact_relationship: String(formData.get("emergencyContactRelationship") ?? "").trim() || null,
  };

  const { error } = await supabase.from("profiles").update(update).eq("user_id", user.id);

  if (error) {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/dashboard/profile");
  return { success: true };
}
