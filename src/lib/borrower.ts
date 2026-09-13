import { createClient } from "@/lib/supabase/server";
import type { LoanApplicationRow, LoanRow, PaymentRow, RepaymentScheduleRow } from "@/types/database";

export async function getOpenApplication(userId: string): Promise<LoanApplicationRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loan_applications")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "under_review"])
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LoanApplicationRow | null) ?? null;
}

export async function getActiveLoan(userId: string): Promise<LoanRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loans")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["approved", "disbursed", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LoanRow | null) ?? null;
}

export async function getLoanById(userId: string, loanId: string): Promise<LoanRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loans")
    .select("*")
    .eq("id", loanId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as LoanRow | null) ?? null;
}

export async function getSchedule(loanId: string): Promise<RepaymentScheduleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("repayment_schedules")
    .select("*")
    .eq("loan_id", loanId)
    .order("installment_number", { ascending: true });
  return (data as RepaymentScheduleRow[]) ?? [];
}

export async function getAllLoans(userId: string): Promise<LoanRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loans")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data as LoanRow[]) ?? [];
}

export async function getRecentPayments(userId: string, limit = 10): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("payment_date", { ascending: false })
    .limit(limit);
  return (data as PaymentRow[]) ?? [];
}

export async function getNextDueInstallment(loanId: string): Promise<RepaymentScheduleRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("repayment_schedules")
    .select("*")
    .eq("loan_id", loanId)
    .in("status", ["pending", "partial", "overdue"])
    .order("installment_number", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as RepaymentScheduleRow | null) ?? null;
}
