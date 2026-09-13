import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatNaira } from "@/lib/finance";
import { Card, StatusBadge, SummaryStat, Alert } from "@/components/ui/Card";
import {
  ApproveApplicationForm,
  RejectApplicationForm,
  DisburseLoanForm,
  RecordPaymentForm,
  RateLoanForm,
} from "@/components/site/AdminLoanActionForms";
import type { LoanApplicationRow, LoanRow, ProfileRow, RepaymentScheduleRow } from "@/types/database";

async function getSignedPhotoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from("kyc-photos").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export default async function AdminLoanDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/loans/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const isLoan = sp?.type === "loan";
  const supabase = await createClient();

  if (isLoan) {
    const { data: loan } = await supabase.from("loans").select("*").eq("id", id).maybeSingle();
    if (!loan) notFound();
    const loanRow = loan as LoanRow;

    const [{ data: profile }, { data: schedule }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", loanRow.user_id).maybeSingle(),
      supabase.from("repayment_schedules").select("*").eq("loan_id", loanRow.id).order("installment_number"),
    ]);
    const profileRow = profile as ProfileRow | null;

    const [receiptUrl, photoUrl] = await Promise.all([
      loanRow.disbursement_receipt_path
        ? (async () => {
            const admin = createAdminClient();
            const { data: signed } = await admin.storage
              .from("disbursement-receipts")
              .createSignedUrl(loanRow.disbursement_receipt_path!, 300);
            return signed?.signedUrl ?? null;
          })()
        : Promise.resolve(null),
      getSignedPhotoUrl(profileRow?.liveness_photo_path ?? null),
    ]);

    return (
      <LoanView
        loan={loanRow}
        profile={profileRow}
        schedule={(schedule as RepaymentScheduleRow[]) ?? []}
        receiptUrl={receiptUrl}
        photoUrl={photoUrl}
      />
    );
  }

  const { data: application } = await supabase.from("loan_applications").select("*").eq("id", id).maybeSingle();
  if (!application) notFound();
  const appRow = application as LoanApplicationRow;

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", appRow.user_id).maybeSingle();
  const profileRow = profile as ProfileRow | null;
  const photoUrl = await getSignedPhotoUrl(profileRow?.liveness_photo_path ?? null);

  return <ApplicationView application={appRow} profile={profileRow} photoUrl={photoUrl} />;
}

function ApplicationView({
  application,
  profile,
  photoUrl,
}: {
  application: LoanApplicationRow;
  profile: ProfileRow | null;
  photoUrl: string | null;
}) {
  const reviewable = application.status === "pending" || application.status === "under_review";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Application {application.id.slice(0, 8).toUpperCase()}</h1>
        <StatusBadge status={application.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="font-semibold text-brand-navy">Applicant</h2>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row">
              {photoUrl && (
                <div className="shrink-0">
                  <KycPhoto url={photoUrl} />
                </div>
              )}
              <dl className="grid flex-1 grid-cols-2 gap-4 text-sm">
                <Detail label="Name" value={profile?.full_name ?? "—"} />
                <Detail label="Email" value={profile?.email ?? "—"} />
                <Detail label="Phone" value={profile?.phone ?? "—"} />
                <Detail label="Monthly income" value={profile?.monthly_income ? formatNaira(profile.monthly_income) : "—"} />
              </dl>
            </div>
            {!photoUrl && <p className="mt-3 text-xs text-brand-slate">No KYC photo on file.</p>}
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Application Details</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Amount requested" value={formatNaira(application.amount)} />
              <Detail label="Duration" value={`${application.duration} months`} />
              <Detail label="Interest rate" value={`${application.interest_rate}%/month`} />
              <Detail label="Processing fee" value={formatNaira(application.processing_fee)} />
              <Detail label="Interest amount" value={formatNaira(application.interest_amount)} />
              <Detail label="Total repayment" value={formatNaira(application.total_repayment)} />
              <Detail label="Submitted" value={new Date(application.submitted_at).toLocaleString()} />
            </dl>
            <div className="mt-4">
              <p className="text-xs uppercase text-brand-slate">Purpose</p>
              <p className="mt-1 text-sm text-brand-navy">{application.purpose}</p>
            </div>
            {application.rejection_reason && (
              <div className="mt-4">
                <Alert variant="error" title="Rejection reason">
                  {application.rejection_reason}
                </Alert>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Disbursement Account</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Bank name" value={application.disbursement_bank_name ?? "—"} />
              <Detail label="Account name" value={application.disbursement_account_name ?? "—"} />
              <Detail label="Account number" value={application.disbursement_account_number ?? "—"} />
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Next of Kin</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Full name" value={application.next_of_kin_full_name ?? "—"} />
              <Detail label="Phone" value={application.next_of_kin_phone ?? "—"} />
              <Detail label="Relationship" value={application.next_of_kin_relationship ?? "—"} />
              <Detail label="Address" value={application.next_of_kin_address ?? "—"} />
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Guarantor</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Full name" value={application.guarantor_full_name ?? "—"} />
              <Detail label="Phone" value={application.guarantor_phone ?? "—"} />
              <Detail label="Relationship" value={application.guarantor_relationship ?? "—"} />
              <Detail label="Occupation" value={application.guarantor_occupation ?? "—"} />
              <Detail label="Address" value={application.guarantor_address ?? "—"} />
            </dl>
          </Card>
        </div>

        {reviewable && (
          <div className="space-y-6">
            <Card>
              <h2 className="mb-3 font-semibold text-brand-navy">Approve</h2>
              <ApproveApplicationForm applicationId={application.id} />
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold text-brand-navy">Reject</h2>
              <RejectApplicationForm applicationId={application.id} />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function LoanView({
  loan,
  profile,
  schedule,
  receiptUrl,
  photoUrl,
}: {
  loan: LoanRow;
  profile: ProfileRow | null;
  schedule: RepaymentScheduleRow[];
  receiptUrl: string | null;
  photoUrl: string | null;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Loan {loan.id.slice(0, 8).toUpperCase()}</h1>
        <StatusBadge status={loan.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat label="Principal" value={formatNaira(loan.principal_amount)} />
        <SummaryStat label="Total Repayment" value={formatNaira(loan.total_repayment)} />
        <SummaryStat label="Amount Repaid" value={formatNaira(loan.amount_repaid)} />
        <SummaryStat label="Outstanding Balance" value={formatNaira(loan.outstanding_balance)} />
      </div>
      {loan.credit_rating != null && (
        <p className="text-sm text-brand-slate">
          Repayment rating: <span className="font-semibold text-brand-navy">{loan.credit_rating}/10</span>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="font-semibold text-brand-navy">Borrower</h2>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row">
              {photoUrl && (
                <div className="shrink-0">
                  <KycPhoto url={photoUrl} />
                </div>
              )}
              <dl className="grid flex-1 grid-cols-2 gap-4 text-sm">
                <Detail label="Name" value={profile?.full_name ?? "—"} />
                <Detail label="Email" value={profile?.email ?? "—"} />
                <Detail label="Phone" value={profile?.phone ?? "—"} />
                <Detail label="Bank" value={profile?.bank_name ? `${profile.bank_name} · ${profile.account_number ?? ""}` : "—"} />
              </dl>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-brand-navy">Disbursement Account</h2>
              {receiptUrl ? <ReceiptLink url={receiptUrl} /> : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Bank name" value={loan.disbursement_bank_name ?? "—"} />
              <Detail label="Account name" value={loan.disbursement_account_name ?? "—"} />
              <Detail label="Account number" value={loan.disbursement_account_number ?? "—"} />
              <Detail label="Reference" value={loan.disbursement_reference ?? "—"} />
            </dl>
            {!receiptUrl && loan.status !== "approved" && (
              <p className="mt-3 text-xs text-brand-slate">No receipt on file.</p>
            )}
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Next of Kin</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Full name" value={loan.next_of_kin_full_name ?? "—"} />
              <Detail label="Phone" value={loan.next_of_kin_phone ?? "—"} />
              <Detail label="Relationship" value={loan.next_of_kin_relationship ?? "—"} />
              <Detail label="Address" value={loan.next_of_kin_address ?? "—"} />
            </dl>
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-navy">Guarantor</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <Detail label="Full name" value={loan.guarantor_full_name ?? "—"} />
              <Detail label="Phone" value={loan.guarantor_phone ?? "—"} />
              <Detail label="Relationship" value={loan.guarantor_relationship ?? "—"} />
              <Detail label="Occupation" value={loan.guarantor_occupation ?? "—"} />
              <Detail label="Address" value={loan.guarantor_address ?? "—"} />
            </dl>
          </Card>

          <div>
            <h2 className="font-semibold text-brand-navy">Repayment Schedule</h2>
            <Card className="mt-3" padded={false}>
              {schedule.length === 0 ? (
                <p className="p-5 text-sm text-brand-slate">Not yet disbursed.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {schedule.map((s) => (
                    <li key={s.id} className="flex items-center justify-between p-4 text-sm">
                      <span>
                        #{s.installment_number} · Due {new Date(s.due_date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-3">
                        {formatNaira(s.amount_due)}
                        <StatusBadge status={s.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {loan.status === "approved" && (
            <Card>
              <h2 className="mb-3 font-semibold text-brand-navy">Disburse Loan</h2>
              <DisburseLoanForm loanId={loan.id} />
            </Card>
          )}
          {(loan.status === "disbursed" || loan.status === "active") && (
            <Card>
              <h2 className="mb-3 font-semibold text-brand-navy">Record Repayment</h2>
              <RecordPaymentForm loanId={loan.id} />
            </Card>
          )}
          {loan.status === "completed" && (
            <Card>
              <h2 className="mb-3 font-semibold text-brand-navy">Repayment Rating</h2>
              <p className="mb-3 text-sm text-brand-slate">
                {loan.credit_rating != null
                  ? "Automatically computed from repayment timeliness. Determines the borrower's credit limit for their next loan — you can override it below if needed."
                  : "This determines the borrower's credit limit for their next loan."}
              </p>
              <RateLoanForm loanId={loan.id} currentRating={loan.credit_rating} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function KycPhoto({ url }: { url: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="KYC verification photo"
      className="h-28 w-28 rounded-xl border border-slate-200 object-cover"
    />
  );
}

function ReceiptLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-blue-500 hover:underline">
      View receipt (admin only) →
    </a>
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