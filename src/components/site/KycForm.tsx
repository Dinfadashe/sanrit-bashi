"use client";

import { useActionState } from "react";
import { submitNinAction, submitBvnAction } from "@/lib/actions/kyc";
import type { ActionResult } from "@/lib/actions/auth";
import type { KycStatus } from "@/types/database";
import { Card, Alert, StatusBadge } from "@/components/ui/Card";
import { Input, Label, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { LivenessCapture } from "@/components/site/LivenessCapture";

const initialState: ActionResult = {};

export function KycForm({
  kycStatus,
  ninVerifiedName,
  bvnVerifiedName,
  kycNotes,
  livenessCaptured,
}: {
  kycStatus: KycStatus;
  ninVerifiedName: string | null;
  bvnVerifiedName: string | null;
  kycNotes: string | null;
  livenessCaptured: boolean;
}) {
  const [ninState, ninAction, ninPending] = useActionState(submitNinAction, initialState);
  const [bvnState, bvnAction, bvnPending] = useActionState(submitBvnAction, initialState);

  const ninDone = kycStatus === "nin_verified" || kycStatus === "verified";
  const idsVerified = kycStatus === "verified";
  const fullyComplete = idsVerified && livenessCaptured;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-brand-slate">Status:</span>
        <StatusBadge status={kycStatus} />
      </div>

      {kycStatus === "mismatch" && (
        <Alert variant="warning" title="Under review">
          {kycNotes ?? "We found a mismatch between your submitted ID and your profile details. Our team will review this shortly — you can also correct your profile if you made a typo."}
        </Alert>
      )}

      {fullyComplete && (
        <Alert variant="success">
          Your identity is verified. You can now apply for a loan.
        </Alert>
      )}
      {idsVerified && !livenessCaptured && (
        <Alert variant="info">One more step — complete the photo capture below to finish verification.</Alert>
      )}

      {/* Step 1: NIN */}
      <Card>
        <h2 className="mb-1 font-semibold text-brand-navy">Step 1 — National Identification Number (NIN)</h2>
        <p className="mb-4 text-sm text-brand-slate">
          Your NIN is checked against your profile name to confirm your identity.
        </p>
        {ninDone ? (
          <p className="text-sm text-emerald-700">
            ✓ Verified{ninVerifiedName ? ` as ${ninVerifiedName}` : ""}.
          </p>
        ) : (
          <form action={ninAction} className="space-y-3">
            {ninState?.error && <Alert variant="error">{ninState.error}</Alert>}
            <div>
              <Label htmlFor="nin" required>
                NIN
              </Label>
              <Input id="nin" name="nin" inputMode="numeric" maxLength={11} placeholder="11-digit number" required />
              <FieldHint>Make sure your profile name exactly matches the name on your NIN.</FieldHint>
            </div>
            <Button type="submit" loading={ninPending}>
              Verify NIN
            </Button>
          </form>
        )}
      </Card>

      {/* Step 2: BVN */}
      <Card className={!ninDone ? "opacity-50" : undefined}>
        <h2 className="mb-1 font-semibold text-brand-navy">Step 2 — Bank Verification Number (BVN)</h2>
        <p className="mb-4 text-sm text-brand-slate">
          Your BVN is checked against your verified NIN details to confirm your banking identity.
        </p>
        {!ninDone ? (
          <p className="text-sm text-brand-slate">Verify your NIN first.</p>
        ) : idsVerified ? (
          <p className="text-sm text-emerald-700">✓ Verified{bvnVerifiedName ? ` as ${bvnVerifiedName}` : ""}.</p>
        ) : (
          <form action={bvnAction} className="space-y-3">
            {bvnState?.error && <Alert variant="error">{bvnState.error}</Alert>}
            <div>
              <Label htmlFor="bvn" required>
                BVN
              </Label>
              <Input id="bvn" name="bvn" inputMode="numeric" maxLength={11} placeholder="11-digit number" required />
            </div>
            <Button type="submit" loading={bvnPending}>
              Verify BVN
            </Button>
          </form>
        )}
      </Card>

      {/* Step 3: Liveness photo */}
      <Card className={!idsVerified ? "opacity-50" : undefined}>
        <h2 className="mb-1 font-semibold text-brand-navy">Step 3 — Photo Capture</h2>
        <p className="mb-4 text-sm text-brand-slate">
          Take a quick photo using your camera to confirm you&apos;re a real person completing this application.
        </p>
        {!idsVerified ? (
          <p className="text-sm text-brand-slate">Complete NIN and BVN verification first.</p>
        ) : (
          <LivenessCapture alreadyCaptured={livenessCaptured} />
        )}
      </Card>
    </div>
  );
}