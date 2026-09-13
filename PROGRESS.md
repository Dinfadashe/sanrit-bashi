# SANRIT BASHI — build status

A product of SANRIT Business Consult.

**Status: MVP complete and verified.** `npm run build`, `npm run lint`, and
`npm run test` all pass clean (see bottom of this file for the exact output).
This has NOT been run against a live Supabase project — that's the one thing
I can't do from here (see "What you still need to do").

## What's built

### Public site
Home, About, How It Works, Loan Calculator (live, uses real rates), Contact,
Privacy & Terms (template placeholders — see below), all responsive with a
mobile nav.

### Auth
Register, login, logout, forgot password, reset password, Supabase email
confirmation + password recovery via `/auth/callback`, middleware session
refresh. Registration creates the `profiles` row and sends a welcome email.

### Borrower dashboard (`/dashboard`)
- Dashboard home: active loan summary, outstanding balance, amount repaid,
  next payment due, recent payments, "no active loan" state
- Profile: personal / employment / bank / emergency contact, all editable
- Apply for a loan: live calculator embedded, purpose field, required
  confirmation checkbox, one-open-application-at-a-time enforced by both the
  server action and a DB unique index
- My Loans + loan detail: full repayment schedule, loan figures
- Repayments: full payment history table
- Notifications: mark read / mark all read

### Admin panel (`/admin`)
- Dashboard: customers, pending applications, approved/active/completed
  loans, total disbursed/repaid/outstanding, overdue count, recent activity
- Loans & Applications: searchable/filterable list, application review,
  Approve (creates the loan record) / Reject (reason required), Disburse
  (generates the repayment schedule), Record Repayment (via the atomic
  `record_payment()` DB function), and **Rate Repayment** (1–10) once a loan
  is completed — this recomputes the borrower's credit limit for their next
  application
- Customers: searchable list, profile + loan history + repayment history,
  Suspend/Reactivate (audit-logged), and a **credit limit** field (based on
  their rating history — see below) that can also be overridden manually
  per customer
- Repayments: full payment log across all customers
- Audit Logs: every approval, rejection, disbursement, payment, credit-limit
  change, and settings change, with who/when/what
- Loan Settings: minimum/maximum amount, interest rate (%/month), processing
  fee (%), min/max duration — all editable, changes never affect loans
  already approved (rates are snapshotted onto each application). Current
  terms: **10% flat monthly interest, 0% processing fee, ₦10,000–₦10,000,000,
  1–3 month tenure** — homepage highlight badges pull these live from the
  database, so they always match what's actually configured.

### Database (`supabase/migrations/`)
`0001_init_schema.sql` — all 9 tables from the spec, enums for every status
field, `numeric(14,2)` for every money column (never floats), RLS on every
table (borrowers see only their own rows; `is_admin()` checked against
`admin_users`, never a client-supplied role), a `credit_limit` column on
`profiles` and a `credit_rating` column on `loans` for the credit mechanic
described below, `record_payment()` — the atomic function that applies a
payment across the schedule, updates the loan balance, flips it to
`completed` when paid off, and writes the audit log + notification — and
`rate_loan()`, the atomic function behind the credit-rating mechanic.

`0002_update_loan_terms_and_credit_limit.sql` and `0003_credit_rating.sql` —
follow-up, idempotent migrations for anyone who already ran an older copy of
`0001` before this update. If you haven't deployed yet, `0001` alone already
has everything current — running `0002` and `0003` afterward is harmless
either way, just redundant.

### Financial engine (`src/lib/finance.ts`)
`calculateLoan()`: flat interest calculated per month (`principal × rate × months`,
not one-time, not compounding) + processing fee, `generateRepaymentSchedule()`
with equal installments that reconcile exactly to the total (rounding
remainder absorbed into the final installment). Same function runs
client-side (preview) and server-side (final validation before saving) —
**7/7 unit tests pass**, `npm run test`.

### Email (Resend)
Templates for: welcome, application submitted, loan approved, loan rejected,
loan disbursed, payment received, loan completed, payment reminder. If
`RESEND_API_KEY` isn't set, sending is skipped with a console warning rather
than crashing — safe to run before you've set up Resend.

### Branding
Logo at `public/logo.png` (icon + "SANRITBASHI" wordmark + "Your Goals. Our
Support." tagline — `.COM` removed per your request). Blue/green theme
sampled from the logo.

## Known simplifications / what's NOT done

- **Credit limit mechanic**: every borrower starts capped at the loan
  product's **minimum amount** (currently ₦10,000) until their first loan is
  completed. Once completed, an admin rates the loan 1–10 from
  `/admin/loans/[id]` (repayment behavior — reliability, timeliness, etc.).
  The borrower's credit limit for their *next* application is then
  recomputed automatically as `minimum_amount × average of all their ratings`,
  clamped to the product's `[minimum_amount, maximum_amount]` range — done
  atomically in the database (`rate_loan()`), so the rating and the limit
  can never drift out of sync. An admin can still manually override the
  number directly from `/admin/customers/[id]` at any time; that manual
  value is what's used until the next rating recomputes it. There's no
  automated credit-scoring algorithm beyond this — the 1-10 rating itself is
  always a human judgment call.
- **Paystack**: the spec asked for admin-recorded repayments now with the
  *architecture* ready for Paystack later — that's what's built. No live
  Paystack integration yet (would be a `payment_method: 'paystack'` row plus
  a webhook route calling `record_payment()`).
- **Fonts**: uses the system font stack, not `next/font/google` — this
  sandbox can't reach `fonts.googleapis.com`. Swapping back to a Google Font
  is a two-line change in `src/app/layout.tsx` and will work fine on Vercel.
- **Privacy Policy / Terms**: real pages, but contain `[INSERT: ...]`
  placeholders for anything that needs a lawyer's input (NDPA 2023
  compliance, dispute resolution, etc.) or your actual FCCPC registration
  status — intentionally not invented.
- **Payment reminder emails**: the template and send function exist
  (`sendPaymentReminderEmail`), but nothing schedules it yet — needs a cron
  (Vercel Cron / Supabase scheduled function) calling `mark_overdue_schedules()`
  and then queuing reminders for upcoming due dates.
- **RLS policies**: written to the spec's exact requirements (own-row-only
  reads, no self-approval, no client-side status manipulation) but not yet
  tested against a live database — see below.

## What you still need to do

1. **Create a Supabase project**, then run `supabase/migrations/0001_init_schema.sql`
   followed by `0002_update_loan_terms_and_credit_limit.sql` in the SQL editor
   (both, in order — `0002` is a harmless no-op on top of a fresh `0001` run,
   and required if you'd already run an older copy of `0001`).
2. **Create your first admin** (deliberately manual — no auto-admin, no
   hardcoded password): sign up through the app normally, then in the SQL
   editor:
   ```sql
   insert into admin_users (user_id, full_name, email, role)
   values ('<the auth.users id>', 'Your Name', 'you@example.com', 'super_admin');
   ```
3. **Copy `.env.example` to `.env.local`** and fill in your Supabase URL/keys
   and Resend key.
4. **Test the RLS policies for real** — try to read another user's loan,
   approve your own application, hit `/admin` as a borrower. I've written
   these carefully but a live adversarial test is the only real proof.
5. **Get Privacy/Terms and the interest rate/fee reviewed** by a Nigerian
   lawyer, and confirm your FCCPC digital-lending registration status before
   taking real customers — this app enforces whatever numbers you configure,
   it doesn't determine what's legally appropriate.

## Verification performed (this session)

```
npm run build   → ✓ compiled, ✓ typechecked, ✓ all 27 routes generated
npm run lint    → ✓ no errors
npm run test    → ✓ 7/7 passed (finance engine)
```
