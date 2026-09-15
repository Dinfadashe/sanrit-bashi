-- ============================================================
-- SANRIT BASHI — migration 0008
-- Records when a borrower accepted the Terms and Conditions at signup —
-- an evidentiary record, not an app-security control, but still protected
-- from later tampering: once set, only the server can change it.
-- ============================================================

alter table profiles
  add column if not exists terms_accepted_at timestamptz;

comment on column profiles.terms_accepted_at is
  'When this borrower ticked "I agree to the Terms and Conditions" at registration. Set once at signup, never by the client afterward.';

revoke update (terms_accepted_at) on profiles from authenticated;