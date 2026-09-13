-- ============================================================
-- SANRIT BASHI — migration 0002
-- Adds per-customer credit limits, and updates loan terms to the
-- founder-confirmed figures: 10% flat monthly interest, zero
-- processing fee, up to ₦10,000,000, 1-3 month tenure.
--
-- Safe to run on either a fresh database (already reflected in
-- 0001_init_schema.sql) or one where 0001 has already been applied —
-- every statement below is idempotent.
-- ============================================================

alter table profiles
  add column if not exists credit_limit numeric(14,2);

do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'profiles_credit_limit_check'
  ) then
    alter table profiles
      add constraint profiles_credit_limit_check check (credit_limit is null or credit_limit >= 0);
  end if;
end $$;

comment on column profiles.credit_limit is
  'Admin-set cap on this borrower''s loan amount, based on credit history/track record. NULL = no override, the loan product''s maximum_amount applies instead.';

update loan_products
set
  interest_rate = 10.0,
  processing_fee_rate = 0.0,
  maximum_amount = 10000000,
  maximum_duration = 3,
  description = 'Standard microloan, 10% flat interest per month, no processing fee, with equal monthly repayments.'
where name = 'SANRIT BASHI Standard Loan';
