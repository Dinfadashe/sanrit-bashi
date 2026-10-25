-- ============================================================
-- SANRIT BASHI — migration 0011 (security hardening)
-- Defense-in-depth: even after the application-code fix (approval now
-- recomputes every financial figure fresh rather than trusting a stored
-- application row — see approveApplicationAction), these constraints make
-- a forged row impossible to insert in the first place, at the database
-- level, regardless of what inserts it.
-- ============================================================

alter table loan_applications
  add constraint loan_applications_total_gte_amount check (total_repayment >= amount),
  add constraint loan_applications_interest_amount_nonneg check (interest_amount >= 0),
  add constraint loan_applications_processing_fee_nonneg check (processing_fee >= 0),
  add constraint loan_applications_rates_nonneg check (interest_rate >= 0 and processing_fee_rate >= 0);
