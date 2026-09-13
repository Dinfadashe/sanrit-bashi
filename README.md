# SANRIT BASHI

**Your Goals. Our Support.**
A product of SANRIT Business Consult.

A full loan management platform: a public marketing site with a live loan
calculator, a borrower dashboard (KYC, apply, track, repay), and an admin
panel (review, approve, disburse, collect repayments, configure settings).
Built on Next.js, TypeScript, Tailwind, and Supabase (Postgres + Auth + RLS
+ Storage), with Dojah for identity verification, Paystack for repayment
collection, and Resend for transactional email.

## What's in the app

**Public site** — home, about, how it works, contact, privacy/terms
(template placeholders — get these reviewed by a lawyer before launch), and
a loan calculator that always reflects the live, currently-configured rates.

**Borrower dashboard** (`/dashboard`)
- Register, log in, complete profile
- **KYC verification**, required before applying: NIN check, then BVN
  cross-checked against the NIN-verified identity, then a camera-captured
  photo (a liveness *deterrent*, not certified biometric liveness detection)
- Apply for a loan: live calculator, purpose, required **next of kin** and
  **guarantor** details, required **disbursement bank account** — a borrower
  can only have one loan open at a time (blocked from applying again until
  the current one is fully repaid)
- First-time borrowers are capped at the minimum loan amount; the cap rises
  automatically as their credit rating improves (see below)
- View loan details, full repayment schedule, and payment history
- **Pay with Paystack** directly from the loan page, any time, for any
  amount up to the outstanding balance — not limited to waiting for a
  scheduled installment
- In-app notifications

**Admin panel** (`/admin`)
- Dashboard: totals, pending applications, disbursed/outstanding amounts,
  overdue count, recent activity
- Review applications (with the borrower's KYC photo shown alongside their
  details), Approve / Reject (reason required)
- Disburse an approved loan — requires uploading a disbursement receipt
  (image or PDF), visible only to admins, never to the borrower
- Record repayments manually (bank transfer/cash) in addition to automatic
  Paystack collection
- Customers: profile, KYC status (with manual override for edge cases),
  loan + repayment history, credit limit (manual override available),
  suspend/reactivate
- Full audit log of every consequential action

## Credit rating — how the limit changes over time

Every borrower starts capped at the loan product's minimum amount. Once a
loan is fully repaid, the database automatically computes a 1–10 rating
from actual repayment timeliness (on-time installments ÷ total, scaled to
10 — paying early or exactly on schedule scores a perfect 10) and
recalculates their credit limit as `minimum_amount × average rating`,
clamped to the product's max. An admin can still manually override either
the rating or the limit at any time.

## Repayment collection — Paystack

A borrower clicks "Pay with Paystack" on their loan page and is redirected
to Paystack's hosted checkout. The **webhook** (`/api/webhooks/paystack`),
not the browser redirect back, is what actually confirms the payment and
applies it — the same atomic `record_payment()` database function used for
admin-recorded payments, so balances, schedules, loan completion, and the
credit rating all update identically regardless of payment method.

**The webhook needs a public HTTPS URL** — it can't reach `localhost`. Set
it in your Paystack dashboard (Settings → API Keys & Webhooks) once
deployed, e.g. `https://yourdomain.com/api/webhooks/paystack`. To test the
webhook before deploying, use a tunnel tool like `ngrok`.

## Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres,
Auth, Row Level Security, Storage) · Dojah (NIN/BVN verification) ·
Paystack (repayment collection) · Resend (transactional email) · decimal.js
(exact money math, never floats) · Vitest

## Setup

1. **Install dependencies**
```bash
   npm install
```

2. **Create a Supabase project**, then run every file in
   `supabase/migrations/` **in order** (SQL Editor → paste → Run), one at a
   time:   This creates all 9 tables, every RLS policy, the `kyc-photos` and
   `disbursement-receipts` private storage buckets, and the
   `record_payment()` / `rate_loan()` / `recompute_credit_limit_for_user()`
   database functions.

3. **Copy the environment file and fill it in:**
```bash
   cp .env.example .env.local
```
   You'll need:
   - Supabase URL, anon key, service role key (Project Settings → API)
   - Resend API key (optional to start — email sending is skipped
     gracefully if unset)
   - Dojah App ID + Secret Key (optional to start — falls back to a mock
     KYC provider for testing; get real sandbox keys at dojah.io)
   - Paystack secret key (**use your test key**, `sk_test_...`, until
     everything is confirmed working — a live key processes real payments)
   - `NEXT_PUBLIC_SITE_URL` — used to build email links and the Paystack
     callback URL

4. **Create your first admin** (deliberately manual — no auto-admin, no
   hardcoded password): register a normal account through the app, find its
   user ID in Supabase (Authentication → Users), then in the SQL Editor:
```sql
   insert into admin_users (user_id, full_name, email, role)
   values ('<user id>', 'Your Name', 'you@example.com', 'super_admin');
```

5. **Run it:**
```bash
   npm run dev
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run test` — finance engine unit tests
- `npm run lint` — ESLint

## Security notes worth knowing

- Every financial calculation is re-validated server-side — a number shown
  in the browser is never trusted for what gets written to the database.
- Row Level Security restricts every borrower to their own rows; admin
  status is checked against the `admin_users` table on every request, never
  inferred from client state.
- Sensitive fields (`credit_limit`, `kyc_status`, verification results,
  liveness photo path) have column-level `REVOKE` protection — a borrower's
  own authenticated session cannot write to them directly, even via the
  Supabase client, only the server (service role) can.
- KYC photos and disbursement receipts live in **private** storage buckets,
  served only via short-lived signed URLs generated server-side for an
  authenticated admin — borrowers never have access to either bucket.
- The Paystack webhook verifies the `x-paystack-signature` HMAC before
  trusting any payload.