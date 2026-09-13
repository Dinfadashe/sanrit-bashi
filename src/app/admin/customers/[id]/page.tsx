import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNaira } from "@/lib/finance";
import { Card, StatusBadge, Alert } from "@/components/ui/Card";
import { CustomerActiveToggle } from "@/components/site/CustomerActiveToggle";
import { CreditLimitForm } from "@/components/site/CreditLimitForm";
import { KycOverrideForm } from "@/components/site/KycOverrideForm";
import type { LoanRow, PaymentRow, ProfileRow } from "@/types/database";

export default async function AdminCustomerDetailPage({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();
  const profileRow = profile as ProfileRow;

  const [{ data: loans }, { data: payments }] = await Promise.all([
    supabase.from("loans").select("*").eq("user_id", profileRow.user_id).order("created_at", { ascending: false }),
    supabase.from("payments").select("*").eq("user_id", profileRow.user_id).order("payment_date", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">{profileRow.full_name}</h1>
        <CustomerActiveToggle profileId={profileRow.id} userId={profileRow.user_id} isActive={profileRow.is_active} />
      </div>

      <Card>
        <h2 className="font-semibold text-brand-navy">Profile</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Detail label="Email" value={profileRow.email} />
          <Detail label="Phone" value={profileRow.phone ?? "—"} />
          <Detail label="City / State" value={[profileRow.city, profileRow.state].filter(Boolean).join(", ") || "—"} />
          <Detail label="Employment" value={profileRow.employment_status ?? "—"} />
          <Detail label="Monthly income" value={profileRow.monthly_income ? formatNaira(profileRow.monthly_income) : "—"} />
          <Detail label="Bank" value={profileRow.bank_name ?? "—"} />
        </dl>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-navy">KYC Verification</h2>
          <StatusBadge status={profileRow.kyc_status} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Detail label="NIN" value={profileRow.nin ? `•••••••${profileRow.nin.slice(-4)}` : "—"} />
          <Detail label="NIN verified name" value={profileRow.nin_verified_full_name ?? "—"} />
          <Detail label="BVN" value={profileRow.bvn ? `•••••••${profileRow.bvn.slice(-4)}` : "—"} />
          <Detail label="BVN verified name" value={profileRow.bvn_verified_full_name ?? "—"} />
        </dl>
        {profileRow.kyc_notes && (
          <div className="mt-4">
            <Alert variant={profileRow.kyc_status === "mismatch" ? "warning" : "info"}>{profileRow.kyc_notes}</Alert>
          </div>
        )}
        <div className="mt-4 max-w-sm">
          <KycOverrideForm profileId={profileRow.id} userId={profileRow.user_id} />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-brand-navy">Credit &amp; Risk</h2>
        <p className="mt-1 text-sm text-brand-slate">
          Current limit:{" "}
          {profileRow.credit_limit != null
            ? formatNaira(profileRow.credit_limit)
            : "Standard minimum (no rating history yet)"}
        </p>
        <div className="mt-4 max-w-sm">
          <CreditLimitForm profileId={profileRow.id} userId={profileRow.user_id} creditLimit={profileRow.credit_limit} />
        </div>
      </Card>

      <div>
        <h2 className="font-semibold text-brand-navy">Loan history</h2>
        <Card className="mt-3" padded={false}>
          {!loans || loans.length === 0 ? (
            <p className="p-5 text-sm text-brand-slate">No loans yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(loans as LoanRow[]).map((loan) => (
                <li key={loan.id}>
                  <Link
                    href={`/admin/loans/${loan.id}?type=loan`}
                    className="flex items-center justify-between p-4 hover:bg-slate-50 sm:p-5"
                  >
                    <span className="text-sm font-medium">{formatNaira(loan.principal_amount)}</span>
                    <span className="flex items-center gap-3">
                      {loan.credit_rating != null && (
                        <span className="text-xs font-semibold text-brand-slate">Rated {loan.credit_rating}/10</span>
                      )}
                      <StatusBadge status={loan.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div>
        <h2 className="font-semibold text-brand-navy">Repayment history</h2>
        <Card className="mt-3" padded={false}>
          {!payments || payments.length === 0 ? (
            <p className="p-5 text-sm text-brand-slate">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {(payments as PaymentRow[]).map((p) => (
                <li key={p.id} className="flex items-center justify-between p-4 text-sm sm:p-5">
                  <span>
                    {formatNaira(p.amount)} · {new Date(p.payment_date).toLocaleDateString()}
                  </span>
                  <StatusBadge status={p.status} />
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
      <dd className="font-medium capitalize text-brand-navy">{value}</dd>
    </div>
  );
}