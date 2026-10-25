import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentReceivedEmail, sendLoanCompletedEmail } from "@/lib/email/send";

// Needs Node's crypto module for HMAC verification — not available on the edge runtime.
export const runtime = "nodejs";

/**
 * Paystack calls this the moment a payment succeeds. This is the actual
 * "automatic detection" in the app — never the borrower's browser redirect
 * back to us, which can be closed or interrupted before it loads.
 *
 * Docs: https://paystack.com/docs/payments/webhooks/
 * Signature: HMAC-SHA512 of the raw request body, hex-encoded, using the
 * Paystack secret key, sent in the x-paystack-signature header. Must be
 * verified against the RAW body — never JSON.parse first.
 */
export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    console.error("[paystack webhook] PAYSTACK_SECRET_KEY is not set — rejecting.");
    return new Response("Server not configured", { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  const expectedHash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");

  if (
    !signature ||
    expectedHash.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(signature))
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // We only act on successful charges. Acknowledge everything else with 200
  // so Paystack doesn't keep retrying events we don't care about.
  if (event?.event !== "charge.success") {
    return new Response("ok", { status: 200 });
  }

  const data = event.data;
  const reference: string | undefined = data?.reference;
  const loanId: string | undefined = data?.metadata?.loan_id;
  const amountKobo: number | undefined = data?.amount;

  if (!reference || !loanId || typeof amountKobo !== "number") {
    // Log only identifiers — the full payload contains the payer's email and card details.
    console.error(`[paystack webhook] Missing reference/loan_id/amount (reference: ${reference ?? "none"})`);
    return new Response("ok", { status: 200 }); // Ack anyway — retrying won't fix a malformed payload.
  }

  // Only apply money that actually arrived, in the currency our loans use.
  if (data?.status !== "success" || data?.currency !== "NGN") {
    console.error(`[paystack webhook] Ignoring non-NGN or non-successful charge (reference: ${reference})`);
    return new Response("ok", { status: 200 });
  }

  const amountNaira = amountKobo / 100;
  const db = createAdminClient();

  const { data: loanBefore } = await db
    .from("loans")
    .select("id, user_id, status, outstanding_balance")
    .eq("id", loanId)
    .maybeSingle();

  if (!loanBefore) {
    console.error(`[paystack webhook] Loan ${loanId} not found for reference ${reference}`);
    return new Response("ok", { status: 200 });
  }

  const { error } = await db.rpc("record_payment", {
    p_loan_id: loanId,
    p_amount: amountNaira,
    p_payment_method: "paystack",
    p_transaction_reference: reference,
    p_recorded_by: null,
    p_notes: "Auto-recorded from Paystack webhook",
  });

  if (error) {
    // A duplicate reference means we already processed this exact payment
    // (Paystack retries webhooks) — that's success, not a failure.
    if (error.message.toLowerCase().includes("duplicate")) {
      return new Response("ok", { status: 200 });
    }
    // Any other error (e.g. amount exceeds balance, loan no longer active)
    // is logged for admin follow-up rather than silently dropped.
    console.error(`[paystack webhook] record_payment failed for loan ${loanId}, ref ${reference}:`, error.message);
    await db.from("audit_logs").insert({
      user_id: loanBefore.user_id,
      action: "paystack_payment_failed_to_apply",
      entity_type: "loan",
      entity_id: loanId,
      description: `Paystack confirmed a payment of ₦${amountNaira} (ref: ${reference}) that could not be applied automatically: ${error.message}`,
    });
    return new Response("ok", { status: 200 }); // Still ack — we've logged it for manual follow-up.
  }

  const { data: profile } = await db
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", loanBefore.user_id)
    .maybeSingle();
  const { data: loanAfter } = await db.from("loans").select("outstanding_balance, status").eq("id", loanId).maybeSingle();

  if (profile && loanAfter) {
    await sendPaymentReceivedEmail({
      to: profile.email,
      fullName: profile.full_name,
      amount: amountNaira,
      outstandingBalance: loanAfter.outstanding_balance,
    }).catch(() => {});

    if (loanAfter.status === "completed") {
      await sendLoanCompletedEmail({ to: profile.email, fullName: profile.full_name }).catch(() => {});
    }
  }

  return new Response("ok", { status: 200 });
}