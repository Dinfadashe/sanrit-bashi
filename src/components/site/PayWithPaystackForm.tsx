"use client";

import { useActionState } from "react";
import { payWithPaystackAction } from "@/lib/actions/paystack";
import type { ActionResult } from "@/lib/actions/auth";
import { Input, Label, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function PayWithPaystackForm({
  loanId,
  outstandingBalance,
  suggestedAmount,
}: {
  loanId: string;
  outstandingBalance: number;
  suggestedAmount: number;
}) {
  const [state, formAction, pending] = useActionState(payWithPaystackAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="loanId" value={loanId} />
      <div>
        <Label htmlFor="amount" required>
          Amount to pay (₦)
        </Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min={1}
          max={outstandingBalance}
          step={0.01}
          defaultValue={suggestedAmount}
          required
        />
        <FieldHint>Up to your outstanding balance of ₦{outstandingBalance.toLocaleString()}.</FieldHint>
      </div>
      <Button type="submit" loading={pending} fullWidth>
        Pay with Paystack
      </Button>
    </form>
  );
}