-- ============================================================
-- SANRIT BASHI — migration 0006
-- 1. Extracts the credit-limit recompute logic (previously inline in
--    rate_loan()) into its own function, recompute_credit_limit_for_user(),
--    so it can be reused.
-- 2. record_payment() now automatically rates a loan the moment it becomes
--    completed — computed from actual repayment timeliness (on-time
--    installments ÷ total installments, scaled to 1-10) — rather than
--    waiting on an admin to click "Rate Repayment". This applies no matter
--    which payment method completed the loan (Paystack or admin-recorded),
--    since punctuality is objective either way. An admin can still
--    manually override the rating afterward via rate_loan() — nothing
--    about the manual path changes.
-- ============================================================

create or replace function recompute_credit_limit_for_user(p_user_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product loan_products%rowtype;
  v_avg_rating numeric;
  v_new_limit numeric;
begin
  select * into v_product from loan_products where is_active = true order by created_at asc limit 1;

  select avg(credit_rating) into v_avg_rating
  from loans
  where user_id = p_user_id and credit_rating is not null;

  if v_product.id is not null and v_avg_rating is not null then
    v_new_limit := least(
      greatest(round(v_product.minimum_amount * v_avg_rating), v_product.minimum_amount),
      v_product.maximum_amount
    );

    update profiles set credit_limit = v_new_limit where user_id = p_user_id;
  end if;

  return v_new_limit;
end;
$$;

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

  v_new_limit := recompute_credit_limit_for_user(v_loan.user_id);

  insert into audit_logs (admin_id, user_id, action, entity_type, entity_id, description)
  values (
    p_admin_id, v_loan.user_id, 'loan_rated', 'loan', p_loan_id,
    format('Manually rated %s/10 (override). Recomputed credit limit: %s', p_rating, coalesce(v_new_limit::text, 'unchanged'))
  );

  return v_new_limit;
end;
$$;

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
  v_just_completed boolean := false;
  v_total_installments int;
  v_on_time_installments int;
  v_auto_rating int;
  v_new_limit numeric;
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

  v_just_completed := (v_loan.outstanding_balance - p_amount) <= 0;

  update loans
  set amount_repaid = amount_repaid + p_amount,
      outstanding_balance = outstanding_balance - p_amount,
      status = case when v_just_completed then 'completed' else 'active' end,
      completed_at = case when v_just_completed then p_payment_date else completed_at end
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
          format('Recorded payment of %s via %s (ref: %s)', p_amount, p_payment_method, p_transaction_reference));

  -- Automatic rating: the moment a loan completes, rate it from actual
  -- repayment timeliness rather than waiting on an admin. on-time = paid_at
  -- falls on or before the installment's due_date. Rating is on-time ratio
  -- scaled to 1-10 (never 0 — a completed loan always earns at least 1).
  if v_just_completed then
    select count(*), count(*) filter (where paid_at is not null and paid_at::date <= due_date)
      into v_total_installments, v_on_time_installments
    from repayment_schedules
    where loan_id = p_loan_id;

    if v_total_installments > 0 then
      v_auto_rating := greatest(1, least(10, round((v_on_time_installments::numeric / v_total_installments) * 10)));
    else
      v_auto_rating := 10;
    end if;

    update loans set credit_rating = v_auto_rating where id = p_loan_id;

    v_new_limit := recompute_credit_limit_for_user(v_loan.user_id);

    insert into audit_logs (admin_id, user_id, action, entity_type, entity_id, description)
    values (
      null, v_loan.user_id, 'loan_auto_rated', 'loan', p_loan_id,
      format(
        'Automatically rated %s/10 (%s of %s installments on time). Recomputed credit limit: %s',
        v_auto_rating, v_on_time_installments, v_total_installments, coalesce(v_new_limit::text, 'unchanged')
      )
    );
  end if;

  return v_payment_id;
end;
$$;