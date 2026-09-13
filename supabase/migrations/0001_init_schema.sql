-- ============================================================
-- SANRIT BASHI — Initial schema
-- A product of SANRIT Business Consult
-- ============================================================
-- Run this against a fresh Supabase project (SQL editor or `supabase db push`).
-- All money columns use numeric(14,2) — never floating point.

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------

create type admin_role as enum ('super_admin', 'loan_officer', 'finance_officer');

create type loan_application_status as enum (
  'draft', 'pending', 'under_review', 'approved', 'rejected', 'cancelled'
);

create type loan_status as enum (
  'approved', 'disbursed', 'active', 'completed', 'defaulted', 'cancelled'
);

create type schedule_status as enum ('pending', 'partial', 'paid', 'overdue');

create type payment_status as enum ('pending', 'successful', 'failed', 'reversed');

create type payment_method as enum ('bank_transfer', 'cash', 'paystack', 'other');

create type notification_type as enum (
  'application_submitted', 'application_under_review', 'loan_approved', 'loan_rejected',
  'loan_disbursed', 'payment_received', 'payment_reminder', 'loan_completed', 'general'
);

create type employment_status as enum ('employed', 'self_employed', 'business_owner', 'unemployed', 'student', 'retired');

-- ------------------------------------------------------------
-- HELPER: updated_at trigger
-- ------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- PROFILES  (one row per auth.users, borrower profile data)
-- ------------------------------------------------------------

create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  date_of_birth date,
  gender text,
  address text,
  city text,
  state text,
  employment_status employment_status,
  employer_name text,
  monthly_income numeric(14,2) check (monthly_income is null or monthly_income >= 0),
  bank_name text,
  account_name text,
  account_number text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  -- Cap on this borrower's next loan amount, in Naira.
  -- NULL means "no rating history yet" — a first-time borrower is capped at
  -- the loan product's minimum_amount until their first loan is rated.
  -- Recomputed automatically as: minimum_amount x (average of all this
  -- borrower's completed-loan credit_rating values, 1-10), clamped to the
  -- product's [minimum_amount, maximum_amount] range. An admin can also set
  -- this directly at any time (see /admin/customers/[id]); doing so is
  -- overwritten the next time a loan is rated.
  credit_limit numeric(14,2) check (credit_limit is null or credit_limit >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_user_id on profiles (user_id);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- ADMIN_USERS  (database-backed authorization — never trust client role)
-- ------------------------------------------------------------

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  role admin_role not null default 'loan_officer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_admin_users_user_id on admin_users (user_id);

create trigger trg_admin_users_updated_at
  before update on admin_users
  for each row execute function set_updated_at();

-- Helper functions used throughout RLS policies (security definer, no recursion risk).

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid() and is_active = true
  );
$$;

create or replace function is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid() and is_active = true and role = 'super_admin'
  );
$$;

-- ------------------------------------------------------------
-- LOAN_PRODUCTS  (configurable loan settings — no hardcoded rules)
-- ------------------------------------------------------------

create table loan_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  minimum_amount numeric(14,2) not null check (minimum_amount > 0),
  maximum_amount numeric(14,2) not null check (maximum_amount >= minimum_amount),
  interest_rate numeric(6,3) not null check (interest_rate >= 0), -- percent charged FLAT PER MONTH (not one-time), e.g. 5 = 5%/month
  processing_fee_rate numeric(6,3) not null default 0 check (processing_fee_rate >= 0), -- percent of principal
  minimum_duration integer not null check (minimum_duration > 0), -- months
  maximum_duration integer not null check (maximum_duration >= minimum_duration),
  repayment_frequency text not null default 'monthly' check (repayment_frequency in ('monthly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_loan_products_updated_at
  before update on loan_products
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- LOAN_APPLICATIONS
-- ------------------------------------------------------------

create table loan_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  loan_product_id uuid not null references loan_products (id),
  amount numeric(14,2) not null check (amount > 0),
  duration integer not null check (duration > 0), -- months
  purpose text not null,
  -- snapshot of rules at time of application, so later settings changes never rewrite history
  interest_rate numeric(6,3) not null,
  processing_fee_rate numeric(6,3) not null,
  processing_fee numeric(14,2) not null,
  interest_amount numeric(14,2) not null,
  total_repayment numeric(14,2) not null,
  status loan_application_status not null default 'pending',
  rejection_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references admin_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_loan_applications_user_id on loan_applications (user_id);
create index idx_loan_applications_status on loan_applications (status);

create trigger trg_loan_applications_updated_at
  before update on loan_applications
  for each row execute function set_updated_at();

-- Prevent a user from having more than one open application at a time.
create unique index uniq_one_open_application_per_user
  on loan_applications (user_id)
  where status in ('pending', 'under_review');

-- ------------------------------------------------------------
-- LOANS  (created once an application is approved)
-- ------------------------------------------------------------

create table loans (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references loan_applications (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  loan_product_id uuid not null references loan_products (id),
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  interest_rate numeric(6,3) not null,
  interest_amount numeric(14,2) not null,
  processing_fee numeric(14,2) not null,
  total_repayment numeric(14,2) not null,
  amount_repaid numeric(14,2) not null default 0 check (amount_repaid >= 0),
  outstanding_balance numeric(14,2) not null check (outstanding_balance >= 0),
  duration integer not null,
  status loan_status not null default 'approved',
  approved_at timestamptz,
  approved_by uuid references admin_users (id),
  disbursed_at timestamptz,
  disbursed_amount numeric(14,2),
  disbursement_reference text,
  disbursement_method text,
  completed_at timestamptz,
  -- Admin's 1-10 rating of this borrower's repayment behavior on this loan,
  -- set once the loan is completed. Drives the borrower's credit_limit for
  -- their NEXT application (see recompute logic in the application layer).
  credit_rating smallint check (credit_rating is null or (credit_rating between 1 and 10)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_loans_user_id on loans (user_id);
create index idx_loans_status on loans (status);

create trigger trg_loans_updated_at
  before update on loans
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- REPAYMENT_SCHEDULES
-- ------------------------------------------------------------

create table repayment_schedules (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  amount_due numeric(14,2) not null check (amount_due > 0),
  amount_paid numeric(14,2) not null default 0 check (amount_paid >= 0),
  status schedule_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (loan_id, installment_number)
);

create index idx_repayment_schedules_loan_id on repayment_schedules (loan_id);
create index idx_repayment_schedules_due_date on repayment_schedules (due_date);

create trigger trg_repayment_schedules_updated_at
  before update on repayment_schedules
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- PAYMENTS
-- ------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id),
  user_id uuid not null references auth.users (id),
  amount numeric(14,2) not null check (amount > 0),
  payment_method payment_method not null default 'bank_transfer',
  transaction_reference text not null,
  status payment_status not null default 'pending',
  payment_date timestamptz not null default now(),
  recorded_by uuid references admin_users (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A reference can only be used once for a *successful* payment (avoids double-counting a
-- receipt while still allowing failed/reversed retries to reuse a reference if needed).
create unique index uniq_successful_payment_reference
  on payments (transaction_reference)
  where status = 'successful';

create index idx_payments_loan_id on payments (loan_id);
create index idx_payments_user_id on payments (user_id);

create trigger trg_payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  message text not null,
  type notification_type not null default 'general',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on notifications (user_id);

-- ------------------------------------------------------------
-- AUDIT_LOGS
-- ------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admin_users (id),
  user_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on audit_logs (entity_type, entity_id);

-- ------------------------------------------------------------
-- SERVER-SIDE FUNCTION: record a repayment and cascade all balance updates
-- Called only from server-side code (admin action) with the service role,
-- so the whole operation is atomic and never left half-applied.
-- ------------------------------------------------------------

create or replace function record_payment(
  p_loan_id uuid,
  p_amount numeric,
  p_payment_method payment_method,
  p_transaction_reference text,
  p_recorded_by uuid,
  p_notes text default null,
  p_payment_date timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_payment_id uuid;
  v_remaining numeric := p_amount;
  v_installment record;
begin
  select * into v_loan from loans where id = p_loan_id for update;

  if not found then
    raise exception 'Loan % not found', p_loan_id;
  end if;

  if v_loan.status not in ('disbursed', 'active') then
    raise exception 'Loan % is not active (status: %) — cannot record repayment', p_loan_id, v_loan.status;
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_amount > v_loan.outstanding_balance then
    raise exception 'Payment amount (%) exceeds outstanding balance (%)', p_amount, v_loan.outstanding_balance;
  end if;

  insert into payments (loan_id, user_id, amount, payment_method, transaction_reference, status, payment_date, recorded_by, notes)
  values (p_loan_id, v_loan.user_id, p_amount, p_payment_method, p_transaction_reference, 'successful', p_payment_date, p_recorded_by, p_notes)
  returning id into v_payment_id;

  -- Apply the payment across outstanding installments, oldest first.
  for v_installment in
    select * from repayment_schedules
    where loan_id = p_loan_id and status in ('pending', 'partial', 'overdue')
    order by installment_number asc
    for update
  loop
    exit when v_remaining <= 0;

    declare
      v_due_remaining numeric := v_installment.amount_due - v_installment.amount_paid;
      v_apply numeric := least(v_due_remaining, v_remaining);
    begin
      update repayment_schedules
      set amount_paid = amount_paid + v_apply,
          status = case when amount_paid + v_apply >= amount_due then 'paid' else 'partial' end,
          paid_at = case when amount_paid + v_apply >= amount_due then p_payment_date else paid_at end
      where id = v_installment.id;

      v_remaining := v_remaining - v_apply;
    end;
  end loop;

  update loans
  set amount_repaid = amount_repaid + p_amount,
      outstanding_balance = outstanding_balance - p_amount,
      status = case when outstanding_balance - p_amount <= 0 then 'completed' else 'active' end,
      completed_at = case when outstanding_balance - p_amount <= 0 then p_payment_date else completed_at end
  where id = p_loan_id;

  insert into notifications (user_id, title, message, type)
  values (
    v_loan.user_id,
    'Payment received',
    format('We received your payment of ₦%s.', to_char(p_amount, 'FM999,999,999.00')),
    'payment_received'
  );

  insert into audit_logs (admin_id, user_id, action, entity_type, entity_id, description)
  values (p_recorded_by, v_loan.user_id, 'payment_recorded', 'loan', p_loan_id,
          format('Recorded payment of %s (ref: %s)', p_amount, p_transaction_reference));

  return v_payment_id;
end;
$$;

-- Mark schedules overdue (intended to be run on a daily schedule, e.g. via pg_cron or an edge function).
create or replace function mark_overdue_schedules()
returns void
language sql
security definer
set search_path = public
as $$
  update repayment_schedules
  set status = 'overdue'
  where status = 'pending' and due_date < current_date;
$$;

-- ------------------------------------------------------------
-- SERVER-SIDE FUNCTION: rate a completed loan (1-10) and recompute the
-- borrower's credit limit for their NEXT application from their full rating
-- history. Atomic, so the rating and the resulting limit are never out of
-- sync. Called only from a trusted admin server action.
-- ------------------------------------------------------------

create or replace function rate_loan(
  p_loan_id uuid,
  p_rating smallint,
  p_admin_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan loans%rowtype;
  v_product loan_products%rowtype;
  v_avg_rating numeric;
  v_new_limit numeric;
begin
  if p_rating < 1 or p_rating > 10 then
    raise exception 'Rating must be between 1 and 10';
  end if;

  select * into v_loan from loans where id = p_loan_id for update;
  if not found then
    raise exception 'Loan % not found', p_loan_id;
  end if;
  if v_loan.status <> 'completed' then
    raise exception 'Loan % is not completed (status: %) — cannot rate yet', p_loan_id, v_loan.status;
  end if;

  update loans set credit_rating = p_rating where id = p_loan_id;

  -- The current standard loan product defines the range a computed limit is clamped to.
  select * into v_product from loan_products where is_active = true order by created_at asc limit 1;

  select avg(credit_rating) into v_avg_rating
  from loans
  where user_id = v_loan.user_id and credit_rating is not null;

  if v_product.id is not null and v_avg_rating is not null then
    v_new_limit := least(
      greatest(round(v_product.minimum_amount * v_avg_rating), v_product.minimum_amount),
      v_product.maximum_amount
    );

    update profiles set credit_limit = v_new_limit where user_id = v_loan.user_id;
  end if;

  insert into audit_logs (admin_id, user_id, action, entity_type, entity_id, description)
  values (
    p_admin_id, v_loan.user_id, 'loan_rated', 'loan', p_loan_id,
    format('Rated %s/10. Recomputed credit limit: %s (avg rating %s)', p_rating, coalesce(v_new_limit::text, 'unchanged'), coalesce(v_avg_rating::text, 'n/a'))
  );

  return v_new_limit;
end;
$$;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table profiles enable row level security;
alter table admin_users enable row level security;
alter table loan_products enable row level security;
alter table loan_applications enable row level security;
alter table loans enable row level security;
alter table repayment_schedules enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

-- PROFILES: users read/update only their own row; admins read all.
create policy "profiles_select_own" on profiles for select
  using (user_id = auth.uid() or is_admin());
create policy "profiles_insert_own" on profiles for insert
  with check (user_id = auth.uid());
create policy "profiles_update_own" on profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Admins may deactivate an account but not silently rewrite personal data client-side;
-- this policy only permits the is_active toggle in application logic.
create policy "profiles_admin_update" on profiles for update
  using (is_admin())
  with check (is_admin());

-- ADMIN_USERS: only readable/writable by super admins (and a row's own owner, read-only).
create policy "admin_users_select" on admin_users for select
  using (user_id = auth.uid() or is_admin());
create policy "admin_users_super_admin_manage" on admin_users for all
  using (is_super_admin())
  with check (is_super_admin());

-- LOAN_PRODUCTS: everyone (incl. anonymous, for the public calculator) may read active products;
-- only admins may write.
create policy "loan_products_public_read" on loan_products for select
  using (is_active = true or is_admin());
create policy "loan_products_admin_write" on loan_products for insert
  with check (is_admin());
create policy "loan_products_admin_update" on loan_products for update
  using (is_admin()) with check (is_admin());

-- LOAN_APPLICATIONS: borrowers see/create their own; only admins may update status.
create policy "loan_applications_select_own" on loan_applications for select
  using (user_id = auth.uid() or is_admin());
create policy "loan_applications_insert_own" on loan_applications for insert
  with check (user_id = auth.uid() and status = 'pending');
create policy "loan_applications_admin_update" on loan_applications for update
  using (is_admin()) with check (is_admin());
-- A borrower may cancel their own still-pending application, nothing else.
create policy "loan_applications_owner_cancel" on loan_applications for update
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'cancelled');

-- LOANS: borrowers read only their own; only admins write (approval/disbursement server-side).
create policy "loans_select_own" on loans for select
  using (user_id = auth.uid() or is_admin());
create policy "loans_admin_write" on loans for insert
  with check (is_admin());
create policy "loans_admin_update" on loans for update
  using (is_admin()) with check (is_admin());

-- REPAYMENT_SCHEDULES: borrowers read their own loan's schedule; only admins/server writes.
create policy "schedules_select_own" on repayment_schedules for select
  using (
    is_admin() or exists (select 1 from loans l where l.id = loan_id and l.user_id = auth.uid())
  );
create policy "schedules_admin_write" on repayment_schedules for insert
  with check (is_admin());
create policy "schedules_admin_update" on repayment_schedules for update
  using (is_admin()) with check (is_admin());

-- PAYMENTS: borrowers read their own; writes only ever happen via record_payment() (security
-- definer, bypasses RLS) called from a trusted server route — no direct client insert policy.
create policy "payments_select_own" on payments for select
  using (user_id = auth.uid() or is_admin());

-- NOTIFICATIONS: users see/update (mark read) only their own.
create policy "notifications_select_own" on notifications for select
  using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- AUDIT_LOGS: admins only.
create policy "audit_logs_admin_read" on audit_logs for select
  using (is_admin());

-- ------------------------------------------------------------
-- SEED: default loan product settings.
--
-- Nigeria has no single fixed statutory cap on consumer-lending interest rates
-- or processing fees — the FCCPC's 2025 Digital Lending Regulations require
-- rates to be transparent and non-exploitative rather than setting a fixed
-- percentage, and state Money Lenders Laws vary and are not uniformly applied
-- to digital lenders. These defaults are therefore a starting point only —
-- every value below is editable at any time from /admin/settings/loans, with
-- no code change or redeploy needed. Get this reviewed against your FCCPC
-- registration/state licensing before going live; this is not legal advice.
-- ------------------------------------------------------------

insert into loan_products (name, description, minimum_amount, maximum_amount, interest_rate, processing_fee_rate, minimum_duration, maximum_duration, repayment_frequency, is_active)
values (
  'SANRIT BASHI Standard Loan',
  'Standard microloan, 10% flat interest per month, no processing fee, with equal monthly repayments.',
  10000,     -- minimum loan amount (₦) — adjustable
  10000000,  -- maximum loan amount (₦) — adjustable; a borrower's effective cap may be
             -- further reduced by their individual credit_limit (see profiles table)
  10.0,      -- interest rate: 10% FLAT PER MONTH (not one-time) — adjustable
  0.0,       -- processing fee: 0% (none) — adjustable
  1,         -- minimum duration (months) — adjustable
  3,         -- maximum duration (months) — adjustable
  'monthly',
  true
);
