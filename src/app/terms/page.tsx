import type { Metadata } from "next";
import { PublicShell } from "@/components/nav/PublicShell";
import { Alert } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 prose prose-slate">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">Terms of Service</h1>
        <p className="text-sm text-brand-slate">Last updated: [INSERT DATE]</p>

        <Alert variant="warning" title="Placeholder document">
          This page contains template sections only. SANRIT BASHI does not claim any regulatory
          license or approval here — insert your actual FCCPC registration / state licensing status
          once confirmed, and have this reviewed by a Nigerian lawyer before launch.
        </Alert>

        <h2>1. Eligibility</h2>
        <p>[INSERT: who may apply — age, residency, identification requirements.]</p>

        <h2>2. Loan terms</h2>
        <p>
          Interest, processing fees, minimum/maximum loan amounts and durations are set out at the
          time of application and shown in full before you submit — see our{" "}
          <a href="/loan-calculator">loan calculator</a>. These figures are configurable by SANRIT
          BASHI from time to time for new applications; they do not change on a loan already in
          progress.
        </p>

        <h2>3. Repayment obligations</h2>
        <p>[INSERT: consequences of late or missed payments, applicable to defaulted loans.]</p>

        <h2>4. Data & privacy</h2>
        <p>
          Your information is handled as described in our <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>5. Dispute resolution</h2>
        <p>[INSERT: governing law and dispute process.]</p>

        <h2>6. Contact</h2>
        <p>See our <a href="/contact">Contact page</a>.</p>
      </div>
    </PublicShell>
  );
}
