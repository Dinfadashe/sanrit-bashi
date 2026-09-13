import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/nav/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "How It Works" };

const steps = [
  {
    title: "1. Register & complete your profile",
    body: "Sign up with your email and phone number, then fill in your personal, employment and bank details. This only needs to be done once.",
  },
  {
    title: "2. Use the calculator",
    body: "Choose a loan amount and duration and see your exact interest, processing fee, total repayment and monthly installment before you apply.",
  },
  {
    title: "3. Submit your application",
    body: "Confirm you've reviewed the terms and submit. Your application status moves from Pending to Under Review.",
  },
  {
    title: "4. Get a decision",
    body: "Our team reviews your application. You'll be notified in-app and by email whether it's approved or rejected, with a reason if rejected.",
  },
  {
    title: "5. Disbursement",
    body: "Once approved, your loan is disbursed and your repayment schedule becomes active on your dashboard.",
  },
  {
    title: "6. Repay on schedule",
    body: "Track your outstanding balance, upcoming due dates, and payment history. Your loan is marked Completed once fully repaid.",
  },
];

export default function HowItWorksPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">How It Works</h1>
        <p className="mt-2 text-brand-slate">From application to final repayment, here&apos;s the full process.</p>

        <ol className="mt-10 space-y-5">
          {steps.map((step) => (
            <li key={step.title}>
              <Card>
                <p className="font-semibold text-brand-navy">{step.title}</p>
                <p className="mt-1 text-sm text-brand-slate">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <Link href="/register">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
