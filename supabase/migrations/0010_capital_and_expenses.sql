-- ============================================================
-- SANRIT BASHI — migration 0010
-- Business financials: admin-entered capital and expenses, combined with
-- actual loan repayment data to compute revenue, profit/loss on the admin
-- dashboard. See src/lib/finances.ts for the calculation logic.
--
-- Both tables are admin-only by design: RLS is enabled but NO policies are
-- created for the `authenticated` or `anon` roles at all — meaning a
-- borrower's own session has zero access, full stop, the same pattern used
-- for the disbursement-receipts storage bucket. Only the service role
-- (admin server actions) can read or write these.
-- ============================================================

create table capital_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('injection', 'withdrawal')),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  entry_date date not null default current_date,
  created_by uuid references admin_users (id),
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  description text,
  expense_date date not null default current_date,
  created_by uuid references admin_users (id),
  created_at timestamptz not null default now()
);

create index idx_capital_entries_date on capital_entries (entry_date);
create index idx_expenses_date on expenses (expense_date);

alter table capital_entries enable row level security;
alter table expenses enable row level security;

comment on table capital_entries is 'Admin-entered capital injections/withdrawals. Admin-only — no RLS policies grant the authenticated/anon roles any access.';
comment on table expenses is 'Admin-entered business expenses. Admin-only — no RLS policies grant the authenticated/anon roles any access.';