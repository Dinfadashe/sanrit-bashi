import type { Metadata } from "next";
import { PublicShell } from "@/components/nav/PublicShell";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "About" };

const services = [
  { title: "Micro Loans", body: "Short-term loans through SANRIT BASHI, with transparent terms shown up front." },
  { title: "Expansion Loans", body: "Financing to help established small businesses grow." },
  { title: "Training", body: "Practical business and financial skills training for our customers and community." },
  { title: "Consultancy", body: "Advisory support for individuals and businesses on financial and business matters." },
  {
    title: "Government Collaboration",
    body: "Working with government organisations on business grants and financial linkages.",
  },
];

export default function AboutPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">About Us</h1>
        <p className="mt-4 text-brand-slate">
          SANRIT BASHI is a subsidiary of SANRIT Business Consult Ltd. We offer Micro Loans,
          Expansion Loans, Training, and Consultancy, and collaborate with government organisations
          on business grants and financial linkages.
        </p>
        <p className="mt-4 text-brand-slate">
          We believe borrowers should always be able to see exactly what a loan will cost before
          they commit to it — the amount, the interest, the fees, and the full repayment schedule.
        </p>

        <h2 className="mt-10 text-xl font-bold text-brand-navy">What we offer</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {services.map((s) => (
            <Card key={s.title}>
              <p className="font-semibold text-brand-navy">{s.title}</p>
              <p className="mt-1 text-sm text-brand-slate">{s.body}</p>
            </Card>
          ))}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card>
            <p className="font-semibold text-brand-navy">Our mission</p>
            <p className="mt-1 text-sm text-brand-slate">
              To support our customers&apos; goals with fair, clearly-explained financing and a
              respectful, straightforward process from application to final repayment.
            </p>
          </Card>
          <Card>
            <p className="font-semibold text-brand-navy">How we operate</p>
            <p className="mt-1 text-sm text-brand-slate">
              Every application is reviewed by our team before a decision is made. Rates and fees
              are published up front and never change on a loan already in progress. A customer&apos;s
              credit history and repayment track record inform their available credit limit over time.
            </p>
          </Card>
        </div>
      </div>
    </PublicShell>
  );
}
