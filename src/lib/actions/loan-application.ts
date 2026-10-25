"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateLoan } from "@/lib/finance";
import { effectiveMaxLoanAmount } from "@/lib/loan-product";
import { isKycComplete } from "@/lib/kyc-status";
import { isProfileComplete } from "@/lib/profile-status";
import { sendApplicationSubmittedEmail } from "@/lib/email/send";
import type { ActionResult } from "./auth";
import type { LoanProductRow } from "@/types/database";

function requiredField(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

export async function applyForLoanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: kycCheck } = await supabase
    .from("profiles")
    .select(
      "kyc_status, liveness_captured_at, phone, date_of_birth, address, city, state, employment_status, monthly_income, bank_name, account_name, account_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!isProfileComplete(kycCheck)) {
    return { error: "Please complete your profile (personal, employment, bank, and emergency contact details) before applying." };
  }

  if (!isKycComplete(kycCheck)) {
    return { error: "You must complete identity verification (NIN, BVN, and a photo) before applying for a loan." };
  }

  // A borrower can't take on a second loan while one is still open — "open"
  // means anything that isn't finished yet (completed) or called off
  // (cancelled). This is re-checked here server-side even though the apply
  // page already blocks the UI for the same reason — never trust the client.
  const { data: openLoan } = await supabase
    .from("loans")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["approved", "disbursed", "active", "defaulted"])
    .maybeSingle();

  if (openLoan) {
    return { error: "You have an active loan. Pay it off before applying for another." };
  }

  const amount = Number(formData.get("amount"));
  const duration = Number(formData.get("duration"));
  const purpose = String(formData.get("purpose") ?? "").trim();
  const confirmed = formData.get("confirmed") === "on";

  if (!confirmed) {
    return { error: "Please confirm you've reviewed the loan terms before submitting." };
  }
  if (!purpose) {
    return { error: "Please tell us the purpose of this loan." };
  }

  // Disbursement account — all three required.
  const disbursementBankName = requiredField(formData, "disbursementBankName");
  const disbursementAccountName = requiredField(formData, "disbursementAccountName");
  const disbursementAccountNumber = requiredField(formData, "disbursementAccountNumber");

  if (!disbursementBankName || !disbursementAccountName || !disbursementAccountNumber) {
    return { error: "Please provide the bank account your loan should be disbursed to." };
  }

  // Next of kin — full name, phone, and relationship are required; address is optional.
  const nextOfKinFullName = requiredField(formData, "nokFullName");
  const nextOfKinPhone = requiredField(formData, "nokPhone");
  const nextOfKinRelationship = requiredField(formData, "nokRelationship");
  const nextOfKinAddress = requiredField(formData, "nokAddress") || null;

  if (!nextOfKinFullName || !nextOfKinPhone || !nextOfKinRelationship) {
    return { error: "Please provide your next of kin's full name, phone number, and relationship." };
  }

  // Guarantor — full name, phone, and relationship are required; occupation/address optional.
  const guarantorFullName = requiredField(formData, "guarantorFullName");
  const guarantorPhone = requiredField(formData, "guarantorPhone");
  const guarantorRelationship = requiredField(formData, "guarantorRelationship");
  const guarantorOccupation = requiredField(formData, "guarantorOccupation") || null;
  const guarantorAddress = requiredField(formData, "guarantorAddress") || null;

  if (!guarantorFullName || !guarantorPhone || !guarantorRelationship) {
    return { error: "Please provide your guarantor's full name, phone number, and relationship." };
  }

  const { data: product } = await supabase
    .from("loan_products")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!product) {
    return { error: "Loan applications are temporarily unavailable. Please try again later." };
  }
  const loanProduct = product as LoanProductRow;

  const { data: profileForLimit } = await supabase
    .from("profiles")
    .select("credit_limit")
    .eq("user_id", user.id)
    .maybeSingle();
  const effectiveMaximum = effectiveMaxLoanAmount(loanProduct, profileForLimit?.credit_limit ?? null);

  if (amount < loanProduct.minimum_amount || amount > effectiveMaximum) {
    return { error: "Loan amount is outside your allowed range." };
  }
  if (duration < loanProduct.minimum_duration || duration > loanProduct.maximum_duration) {
    return { error: "Loan duration is outside the allowed range." };
  }

  // Re-run the SAME calculation server-side — never trust the client's numbers.
  let calc;
  try {
    calc = calculateLoan({
      principal: amount,
      interestRatePercent: loanProduct.interest_rate,
      processingFeeRatePercent: loanProduct.processing_fee_rate,
      durationMonths: duration,
    });
  } catch {
    return { error: "Invalid loan amount or duration." };
  }

  const { data: existing } = await supabase
    .from("loan_applications")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["pending", "under_review"])
    .maybeSingle();

  if (existing) {
    return { error: "You already have an application in progress." };
  }

  const { error: insertError } = await supabase.from("loan_applications").insert({
    user_id: user.id,
    loan_product_id: loanProduct.id,
    amount: calc.principal,
    duration: calc.durationMonths,
    purpose,
    interest_rate: calc.interestRatePercent,
    processing_fee_rate: calc.processingFeeRatePercent,
    processing_fee: calc.processingFee,
    interest_amount: calc.interestAmount,
    total_repayment: calc.totalRepayment,
    status: "pending",
    disbursement_bank_name: disbursementBankName,
    disbursement_account_name: disbursementAccountName,
    disbursement_account_number: disbursementAccountNumber,
    next_of_kin_full_name: nextOfKinFullName,
    next_of_kin_phone: nextOfKinPhone,
    next_of_kin_relationship: nextOfKinRelationship,
    next_of_kin_address: nextOfKinAddress,
    guarantor_full_name: guarantorFullName,
    guarantor_phone: guarantorPhone,
    guarantor_relationship: guarantorRelationship,
    guarantor_address: guarantorAddress,
    guarantor_occupation: guarantorOccupation,
  });

  if (insertError) {
    return { error: "Could not submit your application. Please try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", user.id)
    .maybeSingle();

  // Notifications have no insert policy for borrowers (by design — only the
  // server creates them), so this must use the service role; the previous
  // session-based insert was being silently rejected.
  await createAdminClient().from("notifications").insert({
    user_id: user.id,
    title: "Application submitted",
    message: `Your application for ₦${calc.principal.toLocaleString()} is now pending review.`,
    type: "application_submitted",
  });

  if (profile) {
    await sendApplicationSubmittedEmail({
      to: profile.email,
      fullName: profile.full_name,
      amount: calc.principal,
    }).catch(() => {});
  }

  redirect("/dashboard?applied=1");
}