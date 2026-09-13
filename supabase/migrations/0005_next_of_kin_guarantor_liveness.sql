-- ============================================================
-- SANRIT BASHI — migration 0005
-- 1. Next of kin + guarantor details, collected at loan application time
--    and mirrored onto the loan record when approved.
-- 2. A liveness/selfie photo, captured as part of KYC and stored in a
--    private Supabase Storage bucket.
-- ============================================================

alter table loan_applications
  add column if not exists next_of_kin_full_name text,
  add column if not exists next_of_kin_phone text,
  add column if not exists next_of_kin_relationship text,
  add column if not exists next_of_kin_address text,
  add column if not exists guarantor_full_name text,
  add column if not exists guarantor_phone text,
  add column if not exists guarantor_relationship text,
  add column if not exists guarantor_address text,
  add column if not exists guarantor_occupation text;

alter table loans
  add column if not exists next_of_kin_full_name text,
  add column if not exists next_of_kin_phone text,
  add column if not exists next_of_kin_relationship text,
  add column if not exists next_of_kin_address text,
  add column if not exists guarantor_full_name text,
  add column if not exists guarantor_phone text,
  add column if not exists guarantor_relationship text,
  add column if not exists guarantor_address text,
  add column if not exists guarantor_occupation text;

comment on column loan_applications.next_of_kin_full_name is 'Collected at application time. Required alongside phone + relationship before an application can be submitted.';
comment on column loan_applications.guarantor_full_name is 'Collected at application time. Required alongside phone + relationship before an application can be submitted.';

alter table profiles
  add column if not exists liveness_photo_path text,
  add column if not exists liveness_captured_at timestamptz;

comment on column profiles.liveness_photo_path is 'Path within the private kyc-photos storage bucket, e.g. "<user_id>/<timestamp>.jpg". Written only by the server (service role), never directly by the client.';

revoke update (liveness_photo_path, liveness_captured_at) on profiles from authenticated;

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