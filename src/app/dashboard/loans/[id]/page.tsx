import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-admin";
import { getLoanById, getSchedule, getNextDueInstallment } from "@/lib/borrower";
import { formatNaira } from "@/lib/finance";
import { Card, StatusBadge, SummaryStat, Alert } from "@/components/ui/Card";
import { PayWithPaystackForm } from "@/components/site/PayWithPaystackForm";
import { PrintButton } from "@/components/site/PrintButton";
import { PrintHeader } from "@/components/site/PrintHeader";

export default async function LoanDetailPage({
  params,
  searchParams,
}: PageProps<"/dashboard/loans/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const loan = await getLoanById(user.id, id);

  if (!loan) notFound();

  const schedule = await getSchedule(loan.id);
  const nextInstallment = await getNextDueInstallment(loan.id);
  const canPay = loan.status === "disbursed" || loan.status === "active";
  const justPaid = sp?.payment === "callback";

  return (
    <div className="space-y-8">
      <PrintHeader subtitle="Loan Statement" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Loan {loan.id.slice(0, 8).toUpperCase()}</h1>
          <p className="mt-1 text-brand-slate">Created {new Date(loan.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={loan.status} />
          <PrintButton />
        </div>
      </div>

      {justPaid && (
        <Alert variant="info" title="Payment received by Paystack" className="print:hidden">
          We&apos;re confirming your payment now — this page will update automatically within a few
          seconds once it&apos;s processed. No need to pay again.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Principal" value={formatNaira(loan.principal_amount)} />
        <SummaryStat label="Total Repayment" value={formatNaira(loan.total_repayment)} />
        <SummaryStat label="Amount Repaid" value={formatNaira(loan.amount_repaid)} />
        <SummaryStat label="Outstanding Balance" value={formatNaira(loan.outstanding_balance)} />
      </div>

      {canPay && (
        <Card className="print:hidden">
          <h2 className="mb-3 font-semibold text-brand-navy">Make a Repayment</h2>
          <div className="max-w-sm">
            <PayWithPaystackForm
              loanId={loan.id}
              outstandingBalance={loan.outstanding_balance}
              suggestedAmount={nextInstallment ? Math.min(nextInstallment.amount_due, loan.outstanding_balance) : loan.outstanding_balance}
            />
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-brand-navy">Loan Details</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <Detail label="Interest rate" value={`${loan.interest_rate}% / month`} />
          <Detail label="Interest amount" value={formatNaira(loan.interest_amount)} />
          <Detail label="Processing fee" value={formatNaira(loan.processing_fee)} />
          <Detail label="Duration" value={`${loan.duration} months`} />
          <Detail label="Approved" value={loan.approved_at ? new Date(loan.approved_at).toLocaleDateString() : "—"} />
          <Detail label="Disbursed" value={loan.disbursed_at ? new Date(loan.disbursed_at).toLocaleDateString() : "—"} />
          <Detail label="Disbursed amount" value={loan.disbursed_amount ? formatNaira(loan.disbursed_amount) : "—"} />
          <Detail label="Completed" value={loan.completed_at ? new Date(loan.completed_at).toLocaleDateString() : "—"} />
          {loan.credit_rating != null && <Detail label="Repayment rating" value={`${loan.credit_rating}/10`} />}
        </dl>
      </Card>

      <div>
        <h2 className="font-semibold text-brand-navy">Repayment Schedule</h2>
        <Card className="mt-3" padded={false}>
          {schedule.length === 0 ? (
            <p className="p-5 text-sm text-brand-slate">Schedule not yet generated.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {schedule.map((installment) => (
                <li key={installment.id} className="flex items-center justify-between p-4 sm:p-5">
                  <div>
                    <p className="font-medium text-brand-navy">Payment #{installment.installment_number}</p>
                    <p className="text-xs text-brand-slate">
                      Due: {new Date(installment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-brand-navy">{formatNaira(installment.amount_due)}</p>
                    <StatusBadge status={installment.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-brand-slate">{label}</dt>
      <dd className="font-medium text-brand-navy">{value}</dd>
    </div>
  );
}