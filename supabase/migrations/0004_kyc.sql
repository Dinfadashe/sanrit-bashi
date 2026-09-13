-- ============================================================
-- SANRIT BASHI — migration 0004
-- KYC: NIN as the primary identity check, BVN cross-checked against it.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'kyc_status') then
    create type kyc_status as enum ('not_submitted', 'nin_verified', 'verified', 'mismatch', 'failed');
  end if;
end $$;

alter table profiles
  add column if not exists nin text,
  add column if not exists nin_verified_at timestamptz,
  add column if not exists nin_verified_full_name text,
  add column if not exists nin_verified_date_of_birth date,
  add column if not exists bvn text,
  add column if not exists bvn_verified_at timestamptz,
  add column if not exists bvn_verified_full_name text,
  add column if not exists bvn_verified_date_of_birth date,
  add column if not exists kyc_status kyc_status not null default 'not_submitted',
  add column if not exists kyc_reviewed_by uuid references admin_users (id),
  add column if not exists kyc_notes text;

do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints where constraint_name = 'profiles_nin_format_check'
  ) then
    alter table profiles add constraint profiles_nin_format_check check (nin is null or nin ~ '^[0-9]{11}$');
  end if;
  if not exists (
    select 1 from information_schema.check_constraints where constraint_name = 'profiles_bvn_format_check'
  ) then
    alter table profiles add constraint profiles_bvn_format_check check (bvn is null or bvn ~ '^[0-9]{11}$');
  end if;
end $$;

comment on column profiles.nin is 'Borrower-submitted National Identification Number (11 digits). Sensitive PII.';
comment on column profiles.bvn is 'Borrower-submitted Bank Verification Number (11 digits). Sensitive PII.';
comment on column profiles.kyc_status is
  'not_submitted -> nin_verified (NIN checked, matches profile) -> verified (BVN also checked, matches NIN result). mismatch/failed require admin review.';

revoke update (
  is_active,
  credit_limit,
  kyc_status,
  kyc_reviewed_by,
  kyc_notes,
  nin_verified_at,
  nin_verified_full_name,
  nin_verified_date_of_birth,
  bvn_verified_at,
  bvn_verified_full_name,
  bvn_verified_date_of_birth
) on profiles from authenticated;

insert into storage.buckets (id, name, public)
values ('kyc-photos', 'kyc-photos', false)
on conflict (id) do nothing;

drop policy if exists "kyc_photos_owner_read" on storage.objects;
create policy "kyc_photos_owner_read"
on storage.objects for select
to authenticated
using (bucket_id = 'kyc-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc_photos_owner_insert" on storage.objects;
create policy "kyc_photos_owner_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'kyc-photos' and (storage.foldername(name))[1] = auth.uid()::text);