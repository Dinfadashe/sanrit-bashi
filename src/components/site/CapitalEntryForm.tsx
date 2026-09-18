"use client";

import { useActionState } from "react";
import { addCapitalEntryAction } from "@/lib/actions/finances";
import type { ActionResult } from "@/lib/actions/auth";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function CapitalEntryForm() {
  const [state, formAction, pending] = useActionState(addCapitalEntryAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.message && <Alert variant="success">{state.message}</Alert>}
      <div>
        <Label htmlFor="entryType" required>
          Type
        </Label>
        <Select id="entryType" name="entryType" defaultValue="injection" required>
          <option value="injection">Capital injection (money in)</option>
          <option value="withdrawal">Capital withdrawal (money out)</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="capitalAmount" required>
          Amount (₦)
        </Label>
        <Input id="capitalAmount" name="amount" type="number" min={1} step={0.01} required />
      </div>
      <div>
        <Label htmlFor="capitalDate" required>
          Date
        </Label>
        <Input id="capitalDate" name="entryDate" type="date" defaultValue={today} required />
      </div>
      <div>
        <Label htmlFor="capitalNote">Note</Label>
        <Textarea id="capitalNote" name="note" placeholder="e.g. Founder injection, bank loan, etc." />
      </div>
      <Button type="submit" size="sm" loading={pending}>
        Save Entry
      </Button>
    </form>
  );
}