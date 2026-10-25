-- ============================================================
-- SANRIT BASHI — migration 0012 (privilege lockdown)
--
-- CORRECTS an error in migrations 0004, 0005, 0008 and 0009. Those used
--   REVOKE UPDATE (column, ...) ON table FROM authenticated
-- to stop borrowers editing sensitive columns directly. In PostgreSQL a
-- column-level REVOKE has NO EFFECT when the role already holds the
-- TABLE-level privilege — and Supabase grants table-level privileges to
-- `authenticated` by default (security is meant to come from RLS, which
-- restricts rows, not columns). So those protections never worked: a
-- logged-in borrower could set their own credit_limit / kyc_status /
-- liveness fields directly through the public API.
--
-- The correct pattern, used below, is an ALLOWLIST: revoke the table-level
-- privilege, then grant only the specific columns a borrower may write.
--
-- This migration also:
--   * stops any logged-in user calling the SECURITY DEFINER functions
--     (record_payment, rate_loan, ...) directly — they bypass RLS and had
--     no caller check, so a borrower could mark their own loan as paid;
--   * removes pointless anonymous access to private tables;
--   * removes direct client access to the kyc-photos bucket (uploads go
--     through the server, which validates them);
--   * adds per-user KYC attempt limiting (each attempt costs real money
--     on a live Dojah account).
--
-- Safe to run more than once.
-- ============================================================

-- ------------------------------------------------------------
-- 1. KYC attempt limiting
-- ------------------------------------------------------------
alter table profiles
  add column if not exists kyc_attempt_count integer not null default 0,
  add column if not exists kyc_attempt_window_start timestamptz;

create or replace function consume_kyc_attempt(p_user_id uuid, p_max integer default 6)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ok boolean;
begin
  -- Atomic: a single UPDATE decides whether the attempt is allowed, so
  -- concurrent requests can't both slip under the limit.
  update profiles
  set kyc_attempt_count = case
        when kyc_attempt_window_start is null or kyc_attempt_window_start < now() - interval '24 hours'
          then 1
        else kyc_attempt_count + 1
      end,
      kyc_attempt_window_start = case
        when kyc_attempt_window_start is null or kyc_attempt_window_start < now() - interval '24 hours'
          then now()
        else kyc_attempt_window_start
      end
  where user_id = p_user_id
    and (
      kyc_attempt_window_start is null
      or kyc_attempt_window_start < now() - interval '24 hours'
      or kyc_attempt_count < p_max
    )
  returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

-- ------------------------------------------------------------
-- 2. Privileged functions: service role only.
--    Looked up by name so this works whatever the exact signatures are.
--    (is_admin() / is_super_admin() are deliberately NOT touched — RLS
--    policies call them on behalf of the logged-in user, and they only
--    ever report on the caller themselves.)
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'record_payment',
        'rate_loan',
        'recompute_credit_limit_for_user',
        'accrue_daily_late_fees',
        'mark_overdue_schedules',
        'consume_kyc_attempt'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- Future functions should not be callable by browsers unless explicitly
-- granted. (Existing grants are unaffected.) When you add a new function
-- that logged-in users genuinely need to call, GRANT EXECUTE to it
-- explicitly in the same migration.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- ------------------------------------------------------------
-- 3. profiles: allowlist what a borrower's own session may write.
--    Everything else (credit_limit, kyc_*, nin_verified_*, bvn_verified_*,
--    liveness_*, terms_accepted_at, is_active, kyc_attempt_*, raw nin/bvn)
--    can only be written by the server using the service role.
-- ------------------------------------------------------------
revoke insert, update, delete on profiles from anon, authenticated;

grant update (
  full_name, phone, date_of_birth, gender, address, city, state,
  employment_status, employer_name, monthly_income,
  bank_name, account_name, account_number,
  emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
) on profiles to authenticated;

grant insert (user_id, full_name, email, phone) on profiles to authenticated;

-- ------------------------------------------------------------
-- 4. Anonymous visitors only ever need to read active loan products
--    (the public calculator). Remove their privileges on everything else.
-- ------------------------------------------------------------
revoke all on
  profiles, admin_users, loan_applications, loans, repayment_schedules,
  payments, notifications, audit_logs, capital_entries, expenses
from anon;

-- ------------------------------------------------------------
-- 5. kyc-photos: uploads and reads go through the server (service role),
--    which validates file contents. Remove direct client access so a
--    borrower can't upload arbitrary files into storage themselves.
-- ------------------------------------------------------------
drop policy if exists "kyc_photos_owner_read" on storage.objects;
drop policy if exists "kyc_photos_owner_insert" on storage.objects;
