"use client";

import { useActionState } from "react";
import {
  approveApplicationAction,
  rejectApplicationAction,
  disburseLoanAction,
  recordPaymentAction,
  rateLoanAction,
} from "@/lib/actions/admin-loans";
import type { ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function ApproveApplicationForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(approveApplicationAction, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Approve this loan application? A loan record will be created.")) e.preventDefault();
      }}
      className="space-y-3"
    >
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="applicationId" value={applicationId} />
      <Button type="submit" variant="secondary" loading={pending} fullWidth>
        Approve Application
      </Button>
    </form>
  );
}

export function RejectApplicationForm({ applicationId }: { applicationId: string }) {
  const [state, formAction, pending] = useActionState(rejectApplicationAction, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Reject this loan application? This cannot be undone.")) e.preventDefault();
      }}
      className="space-y-3"
    >
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="applicationId" value={applicationId} />
      <div>
        <Label htmlFor="reason" required>
          Rejection reason
        </Label>
        <Textarea id="reason" name="reason" required placeholder="e.g. Insufficient income documentation" />
      </div>
      <Button type="submit" variant="danger" loading={pending} fullWidth>
        Reject Application
      </Button>
    </form>
  );
}

export function DisburseLoanForm({ loanId }: { loanId: string }) {
  const [state, formAction, pending] = useActionState(disburseLoanAction, initialState);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm("Confirm disbursement? This will generate the repayment schedule.")) e.preventDefault();
      }}
      className="space-y-3"
    >
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="loanId" value={loanId} />
      <div>
        <Label htmlFor="method">Disbursement method</Label>
        <Select id="method" name="method" defaultValue="bank_transfer">
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="reference" required>
          Disbursement reference
        </Label>
        <Input id="reference" name="reference" required placeholder="e.g. bank transfer ref" />
      </div>
      <div>
        <Label htmlFor="receipt" required>
          Disbursement receipt
        </Label>
        <Input id="receipt" name="receipt" type="file" accept="image/*,.pdf" required />
        <FieldHint>Image or PDF, up to 8MB. Visible only to admins, for internal reference.</FieldHint>
      </div>
      <Button type="submit" loading={pending} fullWidth>
        Mark as Disbursed
      </Button>
    </form>
  );
}

export function RecordPaymentForm({ loanId }: { loanId: string }) {
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Payment recorded.</Alert>}
      <input type="hidden" name="loanId" value={loanId} />
      <div>
        <Label htmlFor="amount" required>
          Amount (₦)
        </Label>
        <Input id="amount" name="amount" type="number" min={1} step={0.01} required />
      </div>
      <div>
        <Label htmlFor="method">Payment method</Label>
        <Select id="method" name="method" defaultValue="bank_transfer">
          <option value="bank_transfer">Bank transfer</option>
          <option value="cash">Cash</option>
          <option value="paystack">Paystack</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="reference" required>
          Transaction reference
        </Label>
        <Input id="reference" name="reference" required />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>
      <Button type="submit" loading={pending} fullWidth>
        Record Payment
      </Button>
    </form>
  );
}

export function RateLoanForm({ loanId, currentRating }: { loanId: string; currentRating: number | null }) {
  const [state, formAction, pending] = useActionState(rateLoanAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.success && <Alert variant="success">Rating saved — credit limit recomputed.</Alert>}
      <input type="hidden" name="loanId" value={loanId} />
      <div>
        <Label htmlFor="rating" required>
          Repayment rating (1 = poor, 10 = excellent)
        </Label>
        <Select id="rating" name="rating" defaultValue={currentRating ? String(currentRating) : ""} required>
          <option value="" disabled>
            Select a rating
          </option>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" loading={pending} fullWidth>
        {currentRating ? "Update Rating" : "Save Rating"}
      </Button>
    </form>
  );
}