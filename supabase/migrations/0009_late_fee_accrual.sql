-- ============================================================
-- SANRIT BASHI — migration 0009
-- Late-payment penalty: 1% of the original disbursed principal accrues per
-- day a loan is in default, per the Terms and Conditions (section 4).
--
-- INTERPRETATION NOTE: the terms say "a late-payment penalty of 1% of the
-- disbursed loan amount shall accrue for each day of default" without
-- specifying whether multiple simultaneously-overdue installments stack.
-- This implementation treats the LOAN (not each installment) as being "in
-- default" starting from its earliest currently-overdue installment's due
-- date, charging a flat 1% of principal per day from then — not multiplied
-- by how many installments are overdue at once. If the intent was for the
-- penalty to stack per missed installment, the accrue_daily_late_fees()
-- function below is the only place that would need to change.
--
-- The penalty resets (stops accruing) the moment the loan has no currently
-- overdue installments, and starts fresh from scratch if it defaults again
-- later — it does not just keep counting through a "cured" period.
-- ============================================================

alter table loans
  add column if not exists late_fee_accrued numeric(14,2) not null default 0,
  add column if not exists last_penalty_accrual_date date;

comment on column loans.late_fee_accrued is
  'Cumulative late-payment penalty charged so far (1% of principal per day of default). Already reflected in outstanding_balance — this column is for display/audit only, not an additional amount owed on top.';
comment on column loans.last_penalty_accrual_date is
  'The last date accrue_daily_late_fees() charged a penalty for this loan. NULL means the loan is not currently in a default period (or has never defaulted).';

revoke update (late_fee_accrued, last_penalty_accrual_date) on loans from authenticated;

-- ------------------------------------------------------------
-- Called once daily (see /api/cron/accrue-late-fees, wired to Vercel Cron)
-- or manually by an admin. Safe to call more than once on the same day —
-- it only ever charges for whole days elapsed since the last charge, so a
-- second call on the same day charges 0 additional days.
-- ------------------------------------------------------------

create or replace function accrue_daily_late_fees()
returns table(loan_id uuid, days_charged integer, amount_charged numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan record;
  v_earliest_overdue date;
  v_days integer;
  v_amount numeric;
  v_start date;
begin
  -- Make sure schedule statuses are current before we look at them.
  perform mark_overdue_schedules();

  for v_loan in
    select * from loans where status in ('disbursed', 'active') for update
  loop
    select min(due_date) into v_earliest_overdue
    from repayment_schedules
    where loan_id = v_loan.id and status = 'overdue';

    if v_earliest_overdue is null then
      -- Not currently in default. Reset so a future default starts fresh
      -- rather than silently resuming an old, stale count.
      if v_loan.last_penalty_accrual_date is not null then
        update loans set last_penalty_accrual_date = null where id = v_loan.id;
      end if;
      continue;
    end if;

    v_start := coalesce(v_loan.last_penalty_accrual_date, v_earliest_overdue);
    v_days := (current_date - v_start);

    if v_days > 0 then
      v_amount := round(v_loan.principal_amount * 0.01 * v_days, 2);

      update loans
      set late_fee_accrued = late_fee_accrued + v_amount,
          outstanding_balance = outstanding_balance + v_amount,
          last_penalty_accrual_date = current_date
      where id = v_loan.id;

      insert into audit_logs (user_id, action, entity_type, entity_id, description)
      values (
        v_loan.user_id, 'late_fee_accrued', 'loan', v_loan.id,
        format(
          'Accrued late fee of %s for %s day(s) of default (1%% of principal %s per day, in default since %s)',
          v_amount, v_days, v_loan.principal_amount, v_earliest_overdue
        )
      );

      loan_id := v_loan.id;
      days_charged := v_days;
      amount_charged := v_amount;
      return next;
    end if;
  end loop;

  return;
end;
$$;