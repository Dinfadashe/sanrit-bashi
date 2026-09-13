import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/nav/PublicShell";
import { LoanCalculatorWidget } from "@/components/site/LoanCalculatorWidget";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";
import { getActiveLoanProduct } from "@/lib/loan-product";

export const metadata: Metadata = { title: "Loan Calculator" };

export default async function LoanCalculatorPage() {
  const product = await getActiveLoanProduct();

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">Loan Calculator</h1>
        <p className="mt-2 text-brand-slate">
          Estimate your repayment before you apply. Figures update instantly and use our current rates.
        </p>

        <div className="mt-8">
          {product ? (
            <LoanCalculatorWidget product={product} />
          ) : (
            <Alert variant="warning" title="No active loan product">
              Loan settings haven&apos;t been configured yet. Please check back shortly.
            </Alert>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/register">
            <Button size="lg">Apply for a Loan</Button>
          </Link>
          <Link href="/how-it-works">
            <Button size="lg" variant="outline">
              How It Works
            </Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
