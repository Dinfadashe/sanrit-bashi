"use client";

import { useActionState, useState } from "react";
import { applyForLoanAction } from "@/lib/actions/loan-application";
import type { ActionResult } from "@/lib/actions/auth";
import type { LoanProductRow } from "@/types/database";
import { LoanCalculatorWidget } from "@/components/site/LoanCalculatorWidget";
import { Card, Alert } from "@/components/ui/Card";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import type { calculateLoan } from "@/lib/finance";

const initialState: ActionResult = {};

export function ApplyForm({ product }: { product: LoanProductRow }) {
  const [state, formAction, pending] = useActionState(applyForLoanAction, initialState);
  const [calc, setCalc] = useState<{ amount: number; duration: number; result: ReturnType<typeof calculateLoan> | null }>({
    amount: product.minimum_amount,
    duration: product.minimum_duration,
    result: null,
  });

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <LoanCalculatorWidget product={product} onChange={setCalc} />

      <input type="hidden" name="amount" value={calc.amount} />
      <input type="hidden" name="duration" value={calc.duration} />

      <Card>
        <Label htmlFor="purpose" required>
          Purpose of loan
        </Label>
        <Textarea id="purpose" name="purpose" required placeholder="e.g. Restocking my shop for the festive season" />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-brand-navy">Disbursement Account</h2>
        <p className="mb-4 text-sm text-brand-slate">
          If approved, your loan will be paid into this account. Make sure it&apos;s correct.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="disbursementBankName" required>
              Bank name
            </Label>
            <Input id="disbursementBankName" name="disbursementBankName" required />
          </div>
          <div>
            <Label htmlFor="disbursementAccountNumber" required>
              Account number
            </Label>
            <Input id="disbursementAccountNumber" name="disbursementAccountNumber" inputMode="numeric" required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="disbursementAccountName" required>
              Account name
            </Label>
            <Input id="disbursementAccountName" name="disbursementAccountName" required />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-brand-navy">Next of Kin</h2>
        <p className="mb-4 text-sm text-brand-slate">Someone we can contact on your behalf if needed.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nokFullName" required>
              Full name
            </Label>
            <Input id="nokFullName" name="nokFullName" required />
          </div>
          <div>
            <Label htmlFor="nokPhone" required>
              Phone number
            </Label>
            <Input id="nokPhone" name="nokPhone" type="tel" required />
          </div>
          <div>
            <Label htmlFor="nokRelationship" required>
              Relationship
            </Label>
            <Input id="nokRelationship" name="nokRelationship" placeholder="e.g. Spouse, Sibling, Parent" required />
          </div>
          <div>
            <Label htmlFor="nokAddress">Address</Label>
            <Input id="nokAddress" name="nokAddress" />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-brand-navy">Guarantor</h2>
        <p className="mb-4 text-sm text-brand-slate">Someone willing to vouch for this loan.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="guarantorFullName" required>
              Full name
            </Label>
            <Input id="guarantorFullName" name="guarantorFullName" required />
          </div>
          <div>
            <Label htmlFor="guarantorPhone" required>
              Phone number
            </Label>
            <Input id="guarantorPhone" name="guarantorPhone" type="tel" required />
          </div>
          <div>
            <Label htmlFor="guarantorRelationship" required>
              Relationship to you
            </Label>
            <Input id="guarantorRelationship" name="guarantorRelationship" placeholder="e.g. Friend, Employer, Relative" required />
          </div>
          <div>
            <Label htmlFor="guarantorOccupation">Occupation</Label>
            <Input id="guarantorOccupation" name="guarantorOccupation" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="guarantorAddress">Address</Label>
            <Input id="guarantorAddress" name="guarantorAddress" />
          </div>
        </div>
      </Card>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <input type="checkbox" name="confirmed" required className="mt-0.5 h-4 w-4 accent-brand-blue-500" />
        <span>I have reviewed the loan amount, fees, interest and repayment terms.</span>
      </label>

      <Button type="submit" size="lg" loading={pending} disabled={!calc.result}>
        Submit Application
      </Button>
    </form>
  );
}