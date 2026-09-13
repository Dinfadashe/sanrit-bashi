import type { Metadata } from "next";
import { PublicShell } from "@/components/nav/PublicShell";
import { Alert } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8 prose prose-slate">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">Privacy Policy</h1>
        <p className="text-sm text-brand-slate">Last updated: [INSERT DATE]</p>

        <Alert variant="warning" title="Placeholder document">
          This page contains template sections only. Have a Nigerian lawyer review and complete the
          bracketed sections — particularly data protection compliance under the Nigeria Data
          Protection Act (NDPA) 2023 — before this goes live.
        </Alert>

        <h2>1. Information we collect</h2>
        <p>
          [INSERT: what personal, employment, and financial information is collected during
          registration, profile completion, and loan application.]
        </p>

        <h2>2. How we use your information</h2>
        <p>
          [INSERT: purposes — loan assessment, disbursement, communication, fraud prevention,
          regulatory reporting.]
        </p>

        <h2>3. Data sharing</h2>
        <p>[INSERT: any third parties data is shared with, e.g. payment processors, credit bureaus.]</p>

        <h2>4. Data retention</h2>
        <p>[INSERT: how long records are kept and why.]</p>

        <h2>5. Your rights</h2>
        <p>[INSERT: rights under the NDPA 2023 — access, correction, deletion, objection — and how to exercise them.]</p>

        <h2>6. Contact</h2>
        <p>[INSERT: data protection contact email/address.]</p>
      </div>
    </PublicShell>
  );
}
