import Link from "next/link";
import { requireUser } from "@/lib/auth/require-admin";
import { getAllLoans } from "@/lib/borrower";
import { formatNaira } from "@/lib/finance";
import { Card, StatusBadge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function LoansPage() {
  const user = await requireUser();
  const loans = await getAllLoans(user.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-navy">My Loans</h1>
        <Link href="/dashboard/apply">
          <Button size="sm">Apply for Loan</Button>
        </Link>
      </div>

      {loans.length === 0 ? (
        <Card className="mt-6">
          <p className="text-sm text-brand-slate">You don&apos;t have any loans yet.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {loans.map((loan) => (
            <Link key={loan.id} href={`/dashboard/loans/${loan.id}`}>
              <Card className="transition-colors hover:border-brand-blue-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-navy">{formatNaira(loan.principal_amount)}</p>
                    <p className="text-xs text-brand-slate">
                      {loan.duration} months · Created {new Date(loan.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={loan.status} />
                    <p className="mt-1 text-xs text-brand-slate">
                      Outstanding: {formatNaira(loan.outstanding_balance)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
