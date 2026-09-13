import { createClient } from "@/lib/supabase/server";
import type { LoanApplicationRow, LoanRow, PaymentRow, ProfileRow } from "@/types/database";

export async function getAdminDashboardStats() {
  const supabase = await createClient();

  const [
    { count: totalCustomers },
    { count: pendingApplications },
    { count: approvedLoans },
    { count: activeLoans },
    { count: completedLoans },
    { data: disbursedLoans },
    { data: allPayments },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("loan_applications").select("*", { count: "exact", head: true }).in("status", ["pending", "under_review"]),
    supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("loans").select("*", { count: "exact", head: true }).in("status", ["disbursed", "active"]),
    supabase.from("loans").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("loans").select("disbursed_amount").not("disbursed_amount", "is", null),
    supabase.from("payments").select("amount").eq("status", "successful"),
  ]);

  const { count: overdueCount } = await supabase
    .from("repayment_schedules")
    .select("id", { count: "exact", head: true })
    .eq("status", "overdue");

  const totalDisbursed = (disbursedLoans ?? []).reduce((sum, l) => sum + Number(l.disbursed_amount ?? 0), 0);
  const totalRepayments = (allPayments ?? []).reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const { data: outstandingLoans } = await supabase
    .from("loans")
    .select("outstanding_balance")
    .in("status", ["disbursed", "active"]);
  const totalOutstanding = (outstandingLoans ?? []).reduce((sum, l) => sum + Number(l.outstanding_balance ?? 0), 0);

  return {
    totalCustomers: totalCustomers ?? 0,
    pendingApplications: pendingApplications ?? 0,
    approvedLoans: approvedLoans ?? 0,
    activeLoans: activeLoans ?? 0,
    completedLoans: completedLoans ?? 0,
    totalDisbursed,
    totalRepayments,
    totalOutstanding,
    overdueCount: overdueCount ?? 0,
  };
}

export async function getRecentApplications(limit = 5): Promise<LoanApplicationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loan_applications")
    .select("*")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  return (data as LoanApplicationRow[]) ?? [];
}

export async function getRecentPaymentsAdmin(limit = 5): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("payments").select("*").order("payment_date", { ascending: false }).limit(limit);
  return (data as PaymentRow[]) ?? [];
}

export async function getRecentCustomers(limit = 5): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data as ProfileRow[]) ?? [];
}

export async function getAllApplications(): Promise<LoanApplicationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("loan_applications").select("*").order("submitted_at", { ascending: false });
  return (data as LoanApplicationRow[]) ?? [];
}

export async function getAllLoansAdmin(): Promise<LoanRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
  return (data as LoanRow[]) ?? [];
}

export async function getAllCustomers(): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  return (data as ProfileRow[]) ?? [];
}

export async function getAllPaymentsAdmin(): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("payments").select("*").order("payment_date", { ascending: false });
  return (data as PaymentRow[]) ?? [];
}
