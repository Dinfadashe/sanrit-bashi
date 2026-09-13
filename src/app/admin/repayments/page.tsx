import Link from "next/link";
import { getAllPaymentsAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/finance";
import { Card, StatusBadge, Alert } from "@/components/ui/Card";
import type { ProfileRow } from "@/types/database";

export default async function AdminRepaymentsPage() {
  const payments = await getAllPaymentsAdmin();
  const supabase = await createClient();

  // Look up borrower names for display (small admin dataset — fine to fetch in one query).
  const userIds = Array.from(new Set(payments.map((p) => p.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
    : { data: [] as Pick<ProfileRow, "user_id" | "full_name">[] };
  const nameByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Repayments</h1>
      <p className="mt-1 text-brand-slate">
        To record a new payment, open the relevant loan from{" "}
        <Link href="/admin/loans" className="text-brand-blue-500 hover:underline">
          Loans &amp; Applications
        </Link>
        .
      </p>

      <Alert variant="info" className="mt-4">
        Payments are recorded from a specific loan&apos;s page so the amount, loan status and repayment
        schedule stay in sync automatically.
      </Alert>

      <Card className="mt-6" padded={false}>
        {payments.length === 0 ? (
          <p className="p-5 text-sm text-brand-slate">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-brand-slate">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Date</th>
                  <th className="px-4 py-3 sm:px-5">Customer</th>
                  <th className="px-4 py-3 sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Reference</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                  <th className="px-4 py-3 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">{nameByUserId.get(p.user_id) ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-brand-navy sm:px-5">
                      {formatNaira(p.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-brand-slate sm:px-5">{p.transaction_reference}</td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                      <Link href={`/admin/loans/${p.loan_id}?type=loan`} className="font-medium text-brand-blue-500 hover:underline">
                        View loan
                      </Link>
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
