import Link from "next/link";
import { getAdminDashboardStats, getRecentApplications, getRecentPaymentsAdmin, getRecentCustomers } from "@/lib/admin";
import { getFinancialSummary } from "@/lib/finances";
import { formatNaira } from "@/lib/finance";
import { Card, SummaryStat, StatusBadge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RunLateFeeAccrualButton } from "@/components/site/RunLateFeeAccrualButton";

export default async function AdminDashboardPage() {
  const [stats, recentApplications, recentPayments, recentCustomers, financials] = await Promise.all([
    getAdminDashboardStats(),
    getRecentApplications(),
    getRecentPaymentsAdmin(),
    getRecentCustomers(),
    getFinancialSummary(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-brand-navy">Admin Dashboard</h1>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-brand-navy">Business Financials</h2>
          <Link href="/admin/finances">
            <Button variant="outline" size="sm">
              Full Breakdown →
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Revenue Collected" value={formatNaira(financials.totalRevenueCollected)} />
          <SummaryStat label="Total Expenses" value={formatNaira(financials.totalExpenses)} />
          <SummaryStat
            label={financials.netProfit >= 0 ? "Net Profit" : "Net Loss"}
            value={formatNaira(Math.abs(financials.netProfit))}
          />
          <SummaryStat label="Net Capital" value={formatNaira(financials.netCapital)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Total Customers" value={stats.totalCustomers} />
        <SummaryStat label="Pending Applications" value={stats.pendingApplications} />
        <SummaryStat label="Approved Loans" value={stats.approvedLoans} />
        <SummaryStat label="Active Loans" value={stats.activeLoans} />
        <SummaryStat label="Completed Loans" value={stats.completedLoans} />
        <SummaryStat label="Total Disbursed" value={formatNaira(stats.totalDisbursed)} />
        <SummaryStat label="Total Repayments" value={formatNaira(stats.totalRepayments)} />
        <SummaryStat label="Total Outstanding" value={formatNaira(stats.totalOutstanding)} hint={`${stats.overdueCount} overdue installment(s)`} />
      </div>

      <Card>
        <h2 className="font-semibold text-brand-navy">Late Fee Accrual</h2>
        <p className="mt-1 text-sm text-brand-slate">
          Runs automatically once daily (1am UTC). Use this to run it immediately — safe to click
          any time, it only ever charges for whole days not already charged.
        </p>
        <div className="mt-3">
          <RunLateFeeAccrualButton />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <h2 className="font-semibold text-brand-navy">Recent applications</h2>
          <Card className="mt-3" padded={false}>
            {recentApplications.length === 0 ? (
              <p className="p-4 text-sm text-brand-slate">None yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentApplications.map((a) => (
                  <li key={a.id} className="p-4">
                    <Link href={`/admin/loans/${a.id}`} className="flex items-center justify-between hover:text-brand-blue-500">
                      <span className="text-sm font-medium">{formatNaira(a.amount)}</span>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <h2 className="font-semibold text-brand-navy">Recent repayments</h2>
          <Card className="mt-3" padded={false}>
            {recentPayments.length === 0 ? (
              <p className="p-4 text-sm text-brand-slate">None yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-4 text-sm">
                    <span className="font-medium">{formatNaira(p.amount)}</span>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <h2 className="font-semibold text-brand-navy">Recent registrations</h2>
          <Card className="mt-3" padded={false}>
            {recentCustomers.length === 0 ? (
              <p className="p-4 text-sm text-brand-slate">None yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentCustomers.map((c) => (
                  <li key={c.id} className="p-4">
                    <Link href={`/admin/customers/${c.id}`} className="text-sm font-medium hover:text-brand-blue-500">
                      {c.full_name}
                    </Link>
                    <p className="text-xs text-brand-slate">{c.email}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}