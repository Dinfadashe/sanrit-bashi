import { createClient } from "@/lib/supabase/server";
import type { LoanProductRow } from "@/types/database";

/**
 * Returns the loan amount a borrower is currently allowed to apply for.
 *
 * Every borrower starts capped at the loan product's minimum_amount until
 * their first loan is completed and rated — credit_limit is NULL until then.
 * Once a rating exists, credit_limit is recomputed automatically (see the
 * rate_loan() DB function) and always takes over as the effective cap,
 * clamped to the product's own [minimum_amount, maximum_amount] range.
 */
export function effectiveMaxLoanAmount(product: LoanProductRow, creditLimit: number | null): number {
  if (creditLimit == null) return product.minimum_amount;
  return Math.min(Math.max(creditLimit, product.minimum_amount), product.maximum_amount);
}

/**
 * Returns the single active loan product. The public loan_products_public_read
 * RLS policy allows anyone (including anonymous visitors) to read active products,
 * so this works on public pages too.
 */
export async function getActiveLoanProduct(): Promise<LoanProductRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("loan_products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as LoanProductRow | null) ?? null;
}
