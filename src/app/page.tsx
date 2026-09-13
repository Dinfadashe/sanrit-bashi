import Link from "next/link";
import Image from "next/image";
import { PublicShell } from "@/components/nav/PublicShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getActiveLoanProduct } from "@/lib/loan-product";
import { formatNaira } from "@/lib/finance";

const faqs = [
  {
    q: "How is my repayment amount calculated?",
    a: "Your repayment is your loan amount plus a flat monthly interest rate and a one-time processing fee, spread evenly across your chosen duration. You see the full breakdown before you submit an application.",
  },
  {
    q: "How long does a loan review take?",
    a: "Applications are reviewed by our loan officers in the order they're received. You'll get an in-app and email notification as soon as a decision is made.",
  },
  {
    q: "Can I repay before my loan term ends?",
    a: "Yes. Contact us to arrange an early repayment; your outstanding balance is always visible on your loan dashboard.",
  },
  {
    q: "What happens if I miss a repayment?",
    a: "We'll reach out ahead of your due date as a reminder. If a payment is missed, the installment is marked overdue on your dashboard so you always know exactly where you stand.",
  },
];

const steps = [
  { title: "Create your account", body: "Register and complete your borrower profile in a few minutes." },
  { title: "Apply for a loan", body: "Use the calculator to choose an amount and duration that works for you." },
  { title: "Get reviewed", body: "Our team reviews your application and lets you know the outcome." },
  { title: "Receive & repay", body: "Once approved and disbursed, track your schedule and repayments in one place." },
];

function HighlightBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-brand-green-100 bg-brand-green-50 px-3.5 py-1.5 text-sm font-semibold text-brand-green-600">
      {label}
    </span>
  );
}

/** Formats a rate for display without a trailing ".0" (e.g. 10 not 10.0, but 7.5 stays 7.5). */
function trimZero(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n).replace(/0+$/, "").replace(/\.$/, "");
}

export default async function HomePage() {
  const product = await getActiveLoanProduct();

  return (
    <PublicShell>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-blue-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center rounded-full bg-brand-blue-100 px-3 py-1 text-xs font-semibold text-brand-blue-700">
                A product of SANRIT Business Consult
              </p>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-5xl">
                SANRIT BASHI
              </h1>
              <p className="mt-2 text-xl font-semibold text-brand-green-600">Your Goals. Our Support.</p>
              <p className="mt-5 max-w-xl text-lg text-brand-slate">
                Apply for and manage your loan through a simple, transparent and convenient digital
                platform — clear terms, visible fees, and a repayment schedule you can see up front.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/register">
                  <Button size="lg">Apply for a Loan</Button>
                </Link>
                <Link href="/loan-calculator">
                  <Button size="lg" variant="outline">
                    Calculate Your Loan
                  </Button>
                </Link>
              </div>
              {product && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <HighlightBadge label={`${trimZero(product.interest_rate)}% Monthly Interest`} />
                  <HighlightBadge
                    label={product.processing_fee_rate === 0 ? "Zero Processing Fee" : `${trimZero(product.processing_fee_rate)}% Processing Fee`}
                  />
                  <HighlightBadge label={`Up to ${formatNaira(product.maximum_amount)}`} />
                </div>
              )}
              {product && (
                <p className="mt-4 text-sm text-brand-slate">
                  Loans from {formatNaira(product.minimum_amount)} to {formatNaira(product.maximum_amount)},
                  {" "}
                  {product.minimum_duration}–{product.maximum_duration} month tenure.
                </p>
              )}
            </div>
            <div className="flex justify-center">
              <Image src="/logo.png" alt="SANRIT BASHI" width={360} height={334} className="w-64 sm:w-80" priority />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">How It Works</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <Card key={step.title}>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue-500 text-sm font-bold text-white">
                {i + 1}
              </div>
              <p className="mt-3 font-semibold text-brand-navy">{step.title}</p>
              <p className="mt-1 text-sm text-brand-slate">{step.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">Why SANRIT BASHI</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Card>
              <p className="font-semibold text-brand-navy">Transparent terms</p>
              <p className="mt-1 text-sm text-brand-slate">
                See your interest, fees and full repayment schedule before you apply — no surprises.
              </p>
            </Card>
            <Card>
              <p className="font-semibold text-brand-navy">Simple process</p>
              <p className="mt-1 text-sm text-brand-slate">
                Apply, track your application, and manage repayments from one dashboard.
              </p>
            </Card>
            <Card>
              <p className="font-semibold text-brand-navy">Built for Nigeria</p>
              <p className="mt-1 text-sm text-brand-slate">
                Naira-denominated loans with a process designed around how you actually repay.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">
          Frequently Asked Questions
        </h2>
        <div className="mt-10 space-y-4">
          {faqs.map((item) => (
            <details key={item.q} className="group rounded-xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-brand-navy">
                {item.q}
                <span className="ml-4 text-brand-slate group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-brand-slate">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-brand-blue-500 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to get started?</h2>
          <p className="mt-2 text-brand-blue-50">Create your account and apply in a few minutes.</p>
          <div className="mt-6">
            <Link href="/register">
              <Button size="lg" variant="secondary">
                Apply for a Loan
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
