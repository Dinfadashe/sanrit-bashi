import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { CapitalEntryRow, ExpenseRow } from "@/types/database";

export interface FinancialSummary {
  totalCapitalInjected: number;
  totalCapitalWithdrawn: number;
  netCapital: number;
  totalPrincipalDisbursed: number;
  totalPrincipalCollected: number;
  totalRevenueCollected: number;
  totalExpenses: number;
  netProfit: number;
  potentialLossFromDefaults: number;
}

/**
 * Computes an all-time business financial summary.
 *
 * Uses the admin (service-role) client deliberately: capital_entries and
 * expenses have RLS enabled with NO policies for the authenticated role at
 * all, so a regular session-based client would always see zero rows here,
 * even for a real admin. Because the service-role client bypasses every
 * database protection, each function here verifies the caller is an admin
 * itself rather than trusting whichever page called it.
 *
 * IMPORTANT APPROXIMATION: a repayment isn't recorded as "this much was
 * principal, this much was interest" — record_payment() just applies a
 * lump sum across the schedule. So "revenue collected" (interest +
 * processing fee + late fees, actually collected) is approximated
 * proportionally per loan: whatever fraction of everything owed on that
 * loan is revenue (vs. principal), that same fraction of whatever's been
 * collected so far is counted as revenue. This is a reasonable, standard
 * approximation for a flat-rate loan — not a penny-exact ledger.
 */
export async function getFinancialSummary(): Promise<FinancialSummary> {
  await requireAdmin();
  const supabase = createAdminClient();

  const [{ data: capitalEntries }, { data: expenseRows }, { data: loans }] = await Promise.all([
    supabase.from("capital_entries").select("entry_type, amount"),
    supabase.from("expenses").select("amount"),
    supabase
      .from("loans")
      .select("principal_amount, interest_amount, processing_fee, late_fee_accrued, total_repayment, amount_repaid, disbursed_amount, outstanding_balance, status"),
  ]);

  const totalCapitalInjected = (capitalEntries ?? [])
    .filter((c) => c.entry_type === "injection")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalCapitalWithdrawn = (capitalEntries ?? [])
    .filter((c) => c.entry_type === "withdrawal")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalExpenses = (expenseRows ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  let totalPrincipalDisbursed = 0;
  let totalPrincipalCollected = 0;
  let totalRevenueCollected = 0;
  let potentialLossFromDefaults = 0;

  for (const loan of loans ?? []) {
    totalPrincipalDisbursed += Number(loan.disbursed_amount ?? 0);

    const totalOwed = Number(loan.total_repayment) + Number(loan.late_fee_accrued ?? 0);
    const revenueOwed = Number(loan.interest_amount) + Number(loan.processing_fee) + Number(loan.late_fee_accrued ?? 0);
    const revenueRatio = totalOwed > 0 ? revenueOwed / totalOwed : 0;

    const amountRepaid = Number(loan.amount_repaid ?? 0);
    const revenuePortion = amountRepaid * revenueRatio;
    const principalPortion = amountRepaid - revenuePortion;

    totalRevenueCollected += revenuePortion;
    totalPrincipalCollected += principalPortion;

    if (loan.status === "defaulted") {
      potentialLossFromDefaults += Number(loan.outstanding_balance ?? 0);
    }
  }

  return {
    totalCapitalInjected,
    totalCapitalWithdrawn,
    netCapital: totalCapitalInjected - totalCapitalWithdrawn,
    totalPrincipalDisbursed,
    totalPrincipalCollected: round2(totalPrincipalCollected),
    totalRevenueCollected: round2(totalRevenueCollected),
    totalExpenses,
    netProfit: round2(totalRevenueCollected - totalExpenses),
    potentialLossFromDefaults,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function getCapitalEntries(limit = 50): Promise<CapitalEntryRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("capital_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .limit(limit);
  return (data as CapitalEntryRow[]) ?? [];
}

export async function getExpenses(limit = 50): Promise<ExpenseRow[]> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .limit(limit);
  return (data as ExpenseRow[]) ?? [];
}