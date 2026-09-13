-- ============================================================
-- SANRIT BASHI — migration 0003
-- Adds the credit-rating mechanic: every borrower starts capped at the
-- minimum loan amount; once a loan is completed, an admin rates their
-- repayment 1-10, and their credit limit for future loans is recomputed
-- automatically from the average of all their ratings.
--
-- Safe to run on either a fresh database (already reflected in
-- 0001_init_schema.sql) or one where 0001/0002 have already been applied.
-- ============================================================

alter table loans
  add column if not exists credit_rating smallint;

do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'loans_credit_rating_check'
  ) then
    alter table loans
      add constraint loans_credit_rating_check check (credit_rating is null or (credit_rating between 1 and 10));
  end if;
end $$;

comment on column loans.credit_rating is
  'Admin''s 1-10 rating of this borrower''s repayment behavior on this loan, set once completed. Drives the borrower''s credit_limit for their NEXT application.';

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
