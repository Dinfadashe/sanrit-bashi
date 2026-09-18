import { getFinancialSummary, getCapitalEntries, getExpenses } from "@/lib/finances";
import { formatNaira } from "@/lib/finance";
import { Card, SummaryStat, Alert } from "@/components/ui/Card";
import { CapitalEntryForm } from "@/components/site/CapitalEntryForm";
import { ExpenseForm } from "@/components/site/ExpenseForm";

export default async function AdminFinancesPage() {
  const [summary, capitalEntries, expenses] = await Promise.all([
    getFinancialSummary(),
    getCapitalEntries(),
    getExpenses(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Business Finances</h1>
        <p className="mt-1 text-brand-slate">
          Revenue, profit/loss, and capital position across the whole business.
        </p>
      </div>

      <Alert variant="info">
        Revenue is approximated proportionally from actual repayments collected — loans don&apos;t
        record a hard split between principal and interest per payment, so this is the best
        estimate available, not a penny-exact ledger.
      </Alert>

      <div>
        <h2 className="mb-3 font-semibold text-brand-navy">Profit &amp; Loss</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryStat label="Revenue Collected" value={formatNaira(summary.totalRevenueCollected)} hint="Interest + fees + late fees actually collected" />
          <SummaryStat label="Total Expenses" value={formatNaira(summary.totalExpenses)} />
          <SummaryStat
            label={summary.netProfit >= 0 ? "Net Profit" : "Net Loss"}
            value={formatNaira(Math.abs(summary.netProfit))}
            hint="Revenue collected minus expenses"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-brand-navy">Capital Position</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryStat label="Capital Injected" value={formatNaira(summary.totalCapitalInjected)} />
          <SummaryStat label="Capital Withdrawn" value={formatNaira(summary.totalCapitalWithdrawn)} />
          <SummaryStat label="Net Capital" value={formatNaira(summary.netCapital)} />
          <SummaryStat label="Total Principal Disbursed" value={formatNaira(summary.totalPrincipalDisbursed)} />
          <SummaryStat label="Total Principal Collected" value={formatNaira(summary.totalPrincipalCollected)} />
          <SummaryStat
            label="Potential Loss (Defaults)"
            value={formatNaira(summary.potentialLossFromDefaults)}
            hint="Outstanding balance on loans marked defaulted"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-semibold text-brand-navy">Add Capital Entry</h2>
          <Card>
            <CapitalEntryForm />
          </Card>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-brand-navy">Recent Capital Entries</h3>
          <Card padded={false}>
            {capitalEntries.length === 0 ? (
              <p className="p-5 text-sm text-brand-slate">No capital entries yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {capitalEntries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <p className="font-medium capitalize text-brand-navy">{entry.entry_type}</p>
                      <p className="text-xs text-brand-slate">
                        {new Date(entry.entry_date).toLocaleDateString()}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>
                    <span className={entry.entry_type === "injection" ? "font-semibold text-emerald-700" : "font-semibold text-red-600"}>
                      {entry.entry_type === "injection" ? "+" : "-"}
                      {formatNaira(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <h2 className="mb-3 font-semibold text-brand-navy">Add Expense</h2>
          <Card>
            <ExpenseForm />
          </Card>

          <h3 className="mb-3 mt-6 text-sm font-semibold text-brand-navy">Recent Expenses</h3>
          <Card padded={false}>
            {expenses.length === 0 ? (
              <p className="p-5 text-sm text-brand-slate">No expenses recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <li key={expense.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <p className="font-medium text-brand-navy">{expense.category}</p>
                      <p className="text-xs text-brand-slate">
                        {new Date(expense.expense_date).toLocaleDateString()}
                        {expense.description ? ` · ${expense.description}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold text-red-600">-{formatNaira(expense.amount)}</span>
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