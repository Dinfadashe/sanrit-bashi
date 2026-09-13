-- ============================================================
-- SANRIT BASHI — migration 0007
-- 1. Borrowers now provide a disbursement bank account when applying —
--    mirrored onto the loan record at approval, same pattern as next of
--    kin / guarantor.
-- 2. Admins upload a disbursement receipt when marking a loan disbursed,
--    stored in a private bucket that borrowers can never access — for
--    internal reference only.
-- (The "can't apply again until an active loan is paid off" rule and the
-- "early repayment scores 10/10" behavior are enforced in application code
-- / already fall out of the existing rate_loan timeliness formula — no
-- schema change needed for those two.)
-- ============================================================

alter table loan_applications
  add column if not exists disbursement_bank_name text,
  add column if not exists disbursement_account_name text,
  add column if not exists disbursement_account_number text;

alter table loans
  add column if not exists disbursement_bank_name text,
  add column if not exists disbursement_account_name text,
  add column if not exists disbursement_account_number text,
  add column if not exists disbursement_receipt_path text;

comment on column loan_applications.disbursement_bank_name is 'Bank the borrower wants funds disbursed to. Collected at application time, required before submission.';
comment on column loans.disbursement_receipt_path is 'Path within the private disbursement-receipts storage bucket. Admin-only — borrowers never have access to this bucket or its contents.';

-- Admin-only proof-of-disbursement uploads. No RLS policies are added for
-- the `authenticated` role at all (unlike kyc-photos) — this bucket is
-- reachable only via the service role (our admin server actions), so a
-- borrower's own session has zero access, full stop.
insert into storage.buckets (id, name, public)
values ('disbursement-receipts', 'disbursement-receipts', false)
on conflict (id) do nothing;