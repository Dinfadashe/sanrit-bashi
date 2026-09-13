"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRepaymentSchedule } from "@/lib/finance";
import {
  sendLoanApprovedEmail,
  sendLoanRejectedEmail,
  sendLoanDisbursedEmail,
  sendPaymentReceivedEmail,
  sendLoanCompletedEmail,
} from "@/lib/email/send";
import type { ActionResult } from "./auth";
import type { LoanApplicationRow, PaymentMethod } from "@/types/database";

export async function approveApplicationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const applicationId = String(formData.get("applicationId") ?? "");
  const db = createAdminClient();

  const { data: application } = await db
    .from("loan_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (!application) return { error: "Application not found." };
  const app = application as LoanApplicationRow;

  if (app.status !== "pending" && app.status !== "under_review") {
    return { error: `Cannot approve an application with status "${app.status}".` };
  }

  const now = new Date().toISOString();

  const { data: loan, error: loanError } = await db
    .from("loans")
    .insert({
      application_id: app.id,
      user_id: app.user_id,
      loan_product_id: app.loan_product_id,
      principal_amount: app.amount,
      interest_rate: app.interest_rate,
      interest_amount: app.interest_amount,
      processing_fee: app.processing_fee,
      total_repayment: app.total_repayment,
      amount_repaid: 0,
      outstanding_balance: app.total_repayment,
      duration: app.duration,
      status: "approved",
      approved_at: now,
      approved_by: admin.id,
      next_of_kin_full_name: app.next_of_kin_full_name,
      next_of_kin_phone: app.next_of_kin_phone,
      next_of_kin_relationship: app.next_of_kin_relationship,
      next_of_kin_address: app.next_of_kin_address,
      guarantor_full_name: app.guarantor_full_name,
      guarantor_phone: app.guarantor_phone,
      guarantor_relationship: app.guarantor_relationship,
      guarantor_address: app.guarantor_address,
      guarantor_occupation: app.guarantor_occupation,
      disbursement_bank_name: app.disbursement_bank_name,
      disbursement_account_name: app.disbursement_account_name,
      disbursement_account_number: app.disbursement_account_number,
    })
    .select("*")
    .single();

  if (loanError || !loan) {
    return { error: "Could not create the loan record." };
  }

  await db
    .from("loan_applications")
    .update({ status: "approved", reviewed_at: now, reviewed_by: admin.id })
    .eq("id", app.id);

  await db.from("notifications").insert({
    user_id: app.user_id,
    title: "Loan approved",
    message: `Your loan application for ₦${app.amount.toLocaleString()} has been approved.`,
    type: "loan_approved",
  });

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: app.user_id,
    action: "loan_approved",
    entity_type: "loan_application",
    entity_id: app.id,
    description: `Approved application, created loan ${loan.id}`,
  });

  const { data: profile } = await db.from("profiles").select("full_name, email").eq("user_id", app.user_id).maybeSingle();
  if (profile) {
    await sendLoanApprovedEmail({
      to: profile.email,
      fullName: profile.full_name,
      totalRepayment: app.total_repayment,
    }).catch(() => {});
  }

  revalidatePath("/admin/loans");
  revalidatePath(`/admin/loans/${app.id}`);
  return { success: true };
}

export async function rejectApplicationAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const applicationId = String(formData.get("applicationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) return { error: "A rejection reason is required." };

  const db = createAdminClient();
  const { data: application } = await db.from("loan_applications").select("*").eq("id", applicationId).single();
  if (!application) return { error: "Application not found." };
  const app = application as LoanApplicationRow;

  if (app.status !== "pending" && app.status !== "under_review") {
    return { error: `Cannot reject an application with status "${app.status}".` };
  }

  await db
    .from("loan_applications")
    .update({ status: "rejected", rejection_reason: reason, reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .eq("id", app.id);

  await db.from("notifications").insert({
    user_id: app.user_id,
    title: "Application rejected",
    message: `Your loan application was not approved. Reason: ${reason}`,
    type: "loan_rejected",
  });

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: app.user_id,
    action: "loan_rejected",
    entity_type: "loan_application",
    entity_id: app.id,
    description: reason,
  });

  const { data: profile } = await db.from("profiles").select("full_name, email").eq("user_id", app.user_id).maybeSingle();
  if (profile) {
    await sendLoanRejectedEmail({ to: profile.email, fullName: profile.full_name, reason }).catch(() => {});
  }

  revalidatePath("/admin/loans");
  revalidatePath(`/admin/loans/${app.id}`);
  return { success: true };
}

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8MB

export async function disburseLoanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const loanId = String(formData.get("loanId") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const method = String(formData.get("method") ?? "bank_transfer");
  const receipt = formData.get("receipt");

  if (!reference) return { error: "A disbursement reference is required." };

  if (!(receipt instanceof File) || receipt.size === 0) {
    return { error: "Please upload a disbursement receipt." };
  }
  if (!receipt.type.startsWith("image/") && receipt.type !== "application/pdf") {
    return { error: "Receipt must be an image or a PDF." };
  }
  if (receipt.size > MAX_RECEIPT_BYTES) {
    return { error: "Receipt file is too large (max 8MB)." };
  }

  const db = createAdminClient();
  const { data: loan } = await db.from("loans").select("*").eq("id", loanId).single();
  if (!loan) return { error: "Loan not found." };
  if (loan.status !== "approved") return { error: `Cannot disburse a loan with status "${loan.status}".` };

  const now = new Date().toISOString();

  // Admin-only bucket — a borrower's own session has no access to this at
  // all, by design (see migration 0007). Kept for internal reference only.
  const extension = receipt.type === "application/pdf" ? "pdf" : receipt.type.split("/")[1] || "bin";
  const receiptPath = `${loanId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await db.storage.from("disbursement-receipts").upload(receiptPath, receipt, {
    contentType: receipt.type,
    upsert: true,
  });

  if (uploadError) {
    return { error: "Could not save the disbursement receipt. Please try again." };
  }

  await db
    .from("loans")
    .update({
      status: "disbursed",
      disbursed_at: now,
      disbursed_amount: loan.principal_amount,
      disbursement_reference: reference,
      disbursement_method: method,
      disbursement_receipt_path: receiptPath,
    })
    .eq("id", loanId);

  // Loan becomes "active" the moment it's disbursed, ready to accept repayments.
  await db.from("loans").update({ status: "active" }).eq("id", loanId);

  const schedule = generateRepaymentSchedule(
    { totalRepayment: loan.total_repayment, durationMonths: loan.duration },
    new Date(now)
  );

  await db.from("repayment_schedules").insert(
    schedule.map((installment) => ({
      loan_id: loanId,
      installment_number: installment.installmentNumber,
      due_date: installment.dueDate,
      amount_due: installment.amountDue,
    }))
  );

  await db.from("notifications").insert({
    user_id: loan.user_id,
    title: "Loan disbursed",
    message: `₦${loan.principal_amount.toLocaleString()} has been disbursed to you.`,
    type: "loan_disbursed",
  });

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: loan.user_id,
    action: "loan_disbursed",
    entity_type: "loan",
    entity_id: loanId,
    description: `Disbursed ₦${loan.principal_amount} via ${method}, ref ${reference}`,
  });

  const { data: profile } = await db.from("profiles").select("full_name, email").eq("user_id", loan.user_id).maybeSingle();
  if (profile) {
    await sendLoanDisbursedEmail({ to: profile.email, fullName: profile.full_name, amount: loan.principal_amount }).catch(
      () => {}
    );
  }

  revalidatePath("/admin/loans");
  revalidatePath(`/admin/loans/${loanId}`);
  return { success: true };
}

export async function recordPaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const loanId = String(formData.get("loanId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "bank_transfer") as PaymentMethod;
  const reference = String(formData.get("reference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!reference) return { error: "A transaction reference is required." };
  if (!(amount > 0)) return { error: "Payment amount must be greater than zero." };

  const db = createAdminClient();

  const { data: loanBefore } = await db.from("loans").select("outstanding_balance, user_id").eq("id", loanId).single();
  if (!loanBefore) return { error: "Loan not found." };
  if (amount > loanBefore.outstanding_balance) {
    return { error: "Payment amount exceeds the outstanding balance." };
  }

  const { error } = await db.rpc("record_payment", {
    p_loan_id: loanId,
    p_amount: amount,
    p_payment_method: method,
    p_transaction_reference: reference,
    p_recorded_by: admin.id,
    p_notes: notes,
  });

  if (error) {
    return { error: error.message.includes("duplicate") ? "That transaction reference has already been used." : error.message };
  }

  const { data: loanAfter } = await db.from("loans").select("*").eq("id", loanId).single();

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: loanBefore.user_id,
    action: "payment_recorded",
    entity_type: "loan",
    entity_id: loanId,
    description: `Recorded payment of ₦${amount} (ref: ${reference})`,
  });

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", loanBefore.user_id)
    .maybeSingle();

  if (profile && loanAfter) {
    await sendPaymentReceivedEmail({
      to: profile.email,
      fullName: profile.full_name,
      amount,
      outstandingBalance: loanAfter.outstanding_balance,
    }).catch(() => {});

    if (loanAfter.status === "completed") {
      await sendLoanCompletedEmail({ to: profile.email, fullName: profile.full_name }).catch(() => {});
    }
  }

  revalidatePath("/admin/repayments");
  revalidatePath(`/admin/loans/${loanId}`);
  return { success: true };
}

export async function rateLoanAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const loanId = String(formData.get("loanId") ?? "");
  const rating = Number(formData.get("rating"));

  if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
    return { error: "Rating must be a whole number from 1 to 10." };
  }

  const db = createAdminClient();

  const { error } = await db.rpc("rate_loan", {
    p_loan_id: loanId,
    p_rating: rating,
    p_admin_id: admin.id,
  });

  if (error) {
    return { error: error.message.includes("not completed") ? "Only a completed loan can be rated." : error.message };
  }

  revalidatePath("/admin/loans");
  revalidatePath(`/admin/loans/${loanId}`);
  return { success: true };
}