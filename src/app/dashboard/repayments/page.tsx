import { requireUser } from "@/lib/auth/require-admin";
import { getRecentPayments } from "@/lib/borrower";
import { formatNaira } from "@/lib/finance";
import { Card, StatusBadge } from "@/components/ui/Card";

export default async function RepaymentsPage() {
  const user = await requireUser();
  const payments = await getRecentPayments(user.id, 100);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Repayments</h1>
      <p className="mt-1 text-brand-slate">Every payment recorded against your loans.</p>

      <Card className="mt-6" padded={false}>
        {payments.length === 0 ? (
          <p className="p-5 text-sm text-brand-slate">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-brand-slate">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Date</th>
                  <th className="px-4 py-3 sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Method</th>
                  <th className="px-4 py-3 sm:px-5">Reference</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-brand-navy sm:px-5">
                      {formatNaira(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 capitalize sm:px-5">
                      {payment.payment_method.replace("_", " ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-brand-slate sm:px-5">
                      {payment.transaction_reference}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
