"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack";
import type { ActionResult } from "./auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function payWithPaystackAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const loanId = String(formData.get("loanId") ?? "");
  const amount = Number(formData.get("amount"));

  if (!(amount > 0)) {
    return { error: "Enter a valid amount." };
  }

  const { data: loan } = await supabase
    .from("loans")
    .select("id, user_id, status, outstanding_balance")
    .eq("id", loanId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!loan) return { error: "Loan not found." };
  if (loan.status !== "disbursed" && loan.status !== "active") {
    return { error: "This loan isn't currently accepting repayments." };
  }
  if (amount > loan.outstanding_balance) {
    return { error: `Amount can't exceed your outstanding balance of ₦${loan.outstanding_balance.toLocaleString()}.` };
  }

  const { data: profile } = await supabase.from("profiles").select("email").eq("user_id", user.id).maybeSingle();
  if (!profile?.email) return { error: "Could not find your account email." };

  const result = await initializeTransaction({
    email: profile.email,
    amountNaira: amount,
    loanId: loan.id,
    userId: user.id,
    callbackUrl: `${SITE_URL}/dashboard/loans/${loan.id}?payment=callback`,
  });

  if (!result.ok || !result.authorizationUrl) {
    return { error: result.error ?? "Could not start the payment. Please try again." };
  }

  redirect(result.authorizationUrl);
}