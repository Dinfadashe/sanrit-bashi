"use client";

import { useActionState } from "react";
import { setCreditLimitAction } from "@/lib/actions/admin-settings";
import type { ActionResult } from "@/lib/actions/auth";
import { Input, Label, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function CreditLimitForm({
  profileId,
  userId,
  creditLimit,
}: {
  profileId: string;
  userId: string;
  creditLimit: number | null;
}) {
  const [state, formAction, pending] = useActionState(setCreditLimitAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.success && <Alert variant="success">Credit limit updated.</Alert>}
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="userId" value={userId} />
      <div>
        <Label htmlFor="creditLimit">Individual credit limit (₦)</Label>
        <Input
          id="creditLimit"
          name="creditLimit"
          type="number"
          min={0}
          step={1000}
          defaultValue={creditLimit ?? ""}
          placeholder="No override — new borrowers are capped at the standard minimum"
        />
        <FieldHint>
          This is normally set automatically when you rate a completed loan (1-10) — see that
          loan&apos;s page. You can also override it manually here. Leave blank to clear the override;
          with no rating history, a borrower is capped at the standard minimum loan amount.
        </FieldHint>
      </div>
      <Button type="submit" size="sm" loading={pending}>
        Save Credit Limit
      </Button>
    </form>
  );
}
