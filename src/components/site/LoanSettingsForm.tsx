"use client";

import { useActionState } from "react";
import { updateLoanSettingsAction } from "@/lib/actions/admin-settings";
import type { ActionResult } from "@/lib/actions/auth";
import type { LoanProductRow } from "@/types/database";
import { Card, Alert } from "@/components/ui/Card";
import { Input, Label, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

const initialState: ActionResult = {};

export function LoanSettingsForm({ product }: { product: LoanProductRow }) {
  const [state, formAction, pending] = useActionState(updateLoanSettingsAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state?.success && <Alert variant="success">Loan settings updated. New applications will use these figures.</Alert>}
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <input type="hidden" name="productId" value={product.id} />

      <Card>
        <h2 className="mb-4 font-semibold text-brand-navy">{product.name}</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="minimumAmount" required>Minimum loan amount (₦)</Label>
            <Input id="minimumAmount" name="minimumAmount" type="number" min={1} step={1000} defaultValue={product.minimum_amount} required />
          </div>
          <div>
            <Label htmlFor="maximumAmount" required>Maximum loan amount (₦)</Label>
            <Input id="maximumAmount" name="maximumAmount" type="number" min={1} step={1000} defaultValue={product.maximum_amount} required />
          </div>
          <div>
            <Label htmlFor="interestRate" required>Interest rate (% per month, flat)</Label>
            <Input id="interestRate" name="interestRate" type="number" min={0} step={0.1} defaultValue={product.interest_rate} required />
            <FieldHint>Applied as principal × rate × number of months — not one-time, not compounding.</FieldHint>
          </div>
          <div>
            <Label htmlFor="processingFeeRate" required>Processing fee (% of principal)</Label>
            <Input
              id="processingFeeRate"
              name="processingFeeRate"
              type="number"
              min={0}
              step={0.1}
              defaultValue={product.processing_fee_rate}
              required
            />
          </div>
          <div>
            <Label htmlFor="minimumDuration" required>Minimum duration (months)</Label>
            <Input id="minimumDuration" name="minimumDuration" type="number" min={1} step={1} defaultValue={product.minimum_duration} required />
          </div>
          <div>
            <Label htmlFor="maximumDuration" required>Maximum duration (months)</Label>
            <Input id="maximumDuration" name="maximumDuration" type="number" min={1} step={1} defaultValue={product.maximum_duration} required />
          </div>
        </div>
      </Card>

      <Alert variant="info">
        Nigeria has no single fixed statutory cap on consumer-lending interest rates or processing
        fees — the FCCPC&apos;s Digital Lending Regulations require transparency and non-exploitative
        pricing rather than a set percentage. These figures are yours to set responsibly and can be
        changed at any time; existing loans keep the rate they were approved under.
      </Alert>

      <Button type="submit" loading={pending}>
        Save Settings
      </Button>
    </form>
  );
}
