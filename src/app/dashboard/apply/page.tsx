import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-admin";
import { getActiveLoanProduct, effectiveMaxLoanAmount } from "@/lib/loan-product";
import { getOpenApplication } from "@/lib/borrower";
import { createClient } from "@/lib/supabase/server";
import { isKycComplete } from "@/lib/kyc-status";
import { Alert } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ApplyForm } from "@/components/site/ApplyForm";
import { formatNaira } from "@/lib/finance";

export default async function ApplyPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [product, openApplication, { data: openLoan }, { data: profile }] = await Promise.all([
    getActiveLoanProduct(),
    getOpenApplication(user.id),
    supabase
      .from("loans")
      .select("id, outstanding_balance, status")
      .eq("user_id", user.id)
      .in("status", ["approved", "disbursed", "active", "defaulted"])
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("credit_limit, kyc_status, liveness_captured_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (openApplication) {
    redirect("/dashboard?applied=1");
  }

  if (!isKycComplete(profile)) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-brand-navy">Apply for a Loan</h1>
        <div className="mt-6">
          <Alert variant="warning" title="Identity verification required">
            You need to complete identity verification (NIN, BVN, and a photo) before you can
            apply for a loan.
          </Alert>
          <div className="mt-4">
            <Link href="/dashboard/kyc">
              <Button>Complete Verification</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // A borrower can only have one loan open at a time — pay it off (or it's
  // cancelled) before another application is allowed.
  if (openLoan) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-brand-navy">Apply for a Loan</h1>
        <div className="mt-6">
          <Alert variant="warning" title="You have an active loan">
            You can&apos;t apply for another loan until your current one (outstanding balance{" "}
            {formatNaira(openLoan.outstanding_balance)}) is fully paid off.
          </Alert>
          <div className="mt-4">
            <Link href={`/dashboard/loans/${openLoan.id}`}>
              <Button>View Your Loan</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const creditLimit = profile?.credit_limit ?? null;
  const effectiveMax = product ? effectiveMaxLoanAmount(product, creditLimit) : null;
  const isCapped = product != null && effectiveMax! < product.maximum_amount;
  const effectiveProduct = product && effectiveMax! < product.maximum_amount ? { ...product, maximum_amount: effectiveMax! } : product;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy">Apply for a Loan</h1>
      <p className="mt-1 text-brand-slate">Choose an amount and duration, review the terms, then submit.</p>

      {isCapped && (
        <Alert variant="info" title="Your current credit limit">
          {creditLimit == null
            ? `As a first-time borrower, your maximum loan amount is currently ${formatNaira(effectiveMax!)}. This increases once your first loan is repaid and rated.`
            : `Based on your credit history, your maximum loan amount is currently ${formatNaira(effectiveMax!)}. This can increase as your repayment history grows.`}
        </Alert>
      )}

      <div className="mt-6">
        {effectiveProduct ? (
          <ApplyForm product={effectiveProduct} />
        ) : (
          <Alert variant="warning" title="Applications unavailable">
            Loan settings haven&apos;t been configured yet. Please check back shortly.
          </Alert>
        )}
      </div>
    </div>
  );
}