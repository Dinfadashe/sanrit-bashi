"use client";

import { useActionState } from "react";
import { adminOverrideKycAction } from "@/lib/actions/kyc";
import type { ActionResult } from "@/lib/actions/auth";
import { Select, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function KycOverrideForm({ profileId, userId }: { profileId: string; userId: string }) {
  const [state, formAction, pending] = useActionState(adminOverrideKycAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Override this customer's KYC status? This affects whether they can apply for loans.")) {
          e.preventDefault();
        }
      }}
      className="space-y-3"
    >
      {state?.success && <Alert variant="success">KYC status updated.</Alert>}
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="userId" value={userId} />
      <div>
        <Label htmlFor="decision">Set status to</Label>
        <Select id="decision" name="decision" defaultValue="verified">
          <option value="verified">Verified (allow loan applications)</option>
          <option value="failed">Failed (block until resubmitted)</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notes (reason for override)</Label>
        <Textarea id="notes" name="notes" placeholder="e.g. Name mismatch was just a missing middle name — confirmed via phone." />
      </div>
      <Button type="submit" size="sm" loading={pending}>
        Apply Override
      </Button>
    </form>
  );
}
