"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";

export async function setCustomerActiveAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const isActive = formData.get("isActive") === "true";

  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ is_active: isActive }).eq("id", profileId);
  if (error) return { error: "Could not update customer status." };

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: userId,
    action: isActive ? "customer_activated" : "customer_suspended",
    entity_type: "profile",
    entity_id: profileId,
    description: isActive ? "Account reactivated" : "Account suspended",
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${profileId}`);
  return { success: true };
}

export async function setCreditLimitAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const raw = String(formData.get("creditLimit") ?? "").trim();

  let creditLimit: number | null = null;
  if (raw !== "") {
    creditLimit = Number(raw);
    if (!Number.isFinite(creditLimit) || creditLimit < 0) {
      return { error: "Credit limit must be a positive number, or left blank to remove the override." };
    }
  }

  const db = createAdminClient();
  const { error } = await db.from("profiles").update({ credit_limit: creditLimit }).eq("id", profileId);
  if (error) return { error: "Could not update the credit limit." };

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: userId,
    action: "credit_limit_changed",
    entity_type: "profile",
    entity_id: profileId,
    description: creditLimit === null ? "Removed individual credit limit override" : `Set credit limit to ₦${creditLimit}`,
  });

  revalidatePath(`/admin/customers/${profileId}`);
  return { success: true };
}

export async function updateLoanSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");

  const minimumAmount = Number(formData.get("minimumAmount"));
  const maximumAmount = Number(formData.get("maximumAmount"));
  const interestRate = Number(formData.get("interestRate"));
  const processingFeeRate = Number(formData.get("processingFeeRate"));
  const minimumDuration = Number(formData.get("minimumDuration"));
  const maximumDuration = Number(formData.get("maximumDuration"));

  if (![minimumAmount, maximumAmount, interestRate, processingFeeRate, minimumDuration, maximumDuration].every(Number.isFinite)) {
    return { error: "All fields must be valid numbers." };
  }
  if (minimumAmount < 1) return { error: "Minimum amount must be at least ₦1." };
  if (interestRate > 100 || processingFeeRate > 100) {
    return { error: "Rates above 100% look like a typo — please double-check." };
  }
  if (!Number.isInteger(minimumDuration) || !Number.isInteger(maximumDuration) || minimumDuration < 1 || maximumDuration > 60) {
    return { error: "Durations must be whole months between 1 and 60." };
  }
  if (maximumAmount < minimumAmount) return { error: "Maximum amount must be at least the minimum amount." };
  if (maximumDuration < minimumDuration) return { error: "Maximum duration must be at least the minimum duration." };
  if (interestRate < 0 || processingFeeRate < 0) return { error: "Rates cannot be negative." };

  const db = createAdminClient();
  const { error } = await db
    .from("loan_products")
    .update({
      minimum_amount: minimumAmount,
      maximum_amount: maximumAmount,
      interest_rate: interestRate,
      processing_fee_rate: processingFeeRate,
      minimum_duration: minimumDuration,
      maximum_duration: maximumDuration,
    })
    .eq("id", productId);

  if (error) return { error: "Could not update loan settings." };

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    action: "loan_settings_changed",
    entity_type: "loan_product",
    entity_id: productId,
    description: `Updated to: min ₦${minimumAmount}, max ₦${maximumAmount}, ${interestRate}%/mo interest, ${processingFeeRate}% fee, ${minimumDuration}-${maximumDuration} months`,
  });

  revalidatePath("/admin/settings/loans");
  return { success: true };
}
