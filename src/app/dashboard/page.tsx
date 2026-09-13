import Link from "next/link";
import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveLoan, getOpenApplication, getNextDueInstallment, getRecentPayments } from "@/lib/borrower";
import { isKycComplete } from "@/lib/kyc-status";
import { formatNaira } from "@/lib/finance";
import { Card, SummaryStat, StatusBadge, Alert } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [loan, openApplication, payments, { data: profile }] = await Promise.all([
    getActiveLoan(user.id),
    getOpenApplication(user.id),
    getRecentPayments(user.id, 5),
    supabase.from("profiles").select("kyc_status, liveness_captured_at").eq("user_id", user.id).maybeSingle(),
  ]);
  const nextInstallment = loan ? await getNextDueInstallment(loan.id) : null;
  const kycVerified = isKycComplete(profile);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>
        <p className="mt-1 text-brand-slate">Here&apos;s an overview of your loan activity.</p>
      </div>

      {!kycVerified && (
        <Alert variant="warning" title="Identity verification required">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Complete your NIN and BVN verification before you can apply for a loan.</span>
            <Link href="/dashboard/kyc">
              <Button size="sm">Verify Now</Button>
            </Link>
          </div>
        </Alert>
      )}

      {openApplication && (
        <Card className="border-brand-blue-100 bg-brand-blue-50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-navy">
                Application for {formatNaira(openApplication.amount)} is{" "}
                <StatusBadge status={openApplication.status} />
              </p>
              <p className="mt-1 text-sm text-brand-slate">
                Submitted {new Date(openApplication.submitted_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {loan ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat label="Active Loan" value={formatNaira(loan.principal_amount)} hint={`Status: ${loan.status}`} />
            <SummaryStat label="Outstanding Balance" value={formatNaira(loan.outstanding_balance)} />
            <SummaryStat label="Amount Repaid" value={formatNaira(loan.amount_repaid)} />
            <SummaryStat
              label="Next Payment"
              value={nextInstallment ? formatNaira(nextInstallment.amount_due) : "—"}
              hint={nextInstallment ? `Due ${new Date(nextInstallment.due_date).toLocaleDateString()}` : "No installments due"}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={`/dashboard/loans/${loan.id}`}>
              <Button>View Loan</Button>
            </Link>
            <Link href="/dashboard/repayments">
              <Button variant="outline">Payment History</Button>
            </Link>
          </div>
        </>
      ) : (
        !openApplication && (
          <Card>
            <p className="font-semibold text-brand-navy">You don&apos;t have an active loan.</p>
            <p className="mt-1 text-sm text-brand-slate">Apply now to get started.</p>
            <div className="mt-4">
              <Link href="/dashboard/apply">
                <Button>Apply for a Loan</Button>
              </Link>
            </div>
          </Card>
        )
      )}

      <div>
        <h2 className="text-lg font-semibold text-brand-navy">Recent payments</h2>
        <Card className="mt-3" padded={false}>
          {payments.length === 0 ? (
            <p className="p-5 text-sm text-brand-slate">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {payments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between p-4 sm:p-5">
                  <div>
                    <p className="font-medium text-brand-navy">{formatNaira(payment.amount)}</p>
                    <p className="text-xs text-brand-slate">
                      {new Date(payment.payment_date).toLocaleDateString()} · {payment.payment_method.replace("_", " ")}
                    </p>
                  </div>
                  <StatusBadge status={payment.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}