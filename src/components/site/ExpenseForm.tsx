"use client";

import { useActionState } from "react";
import { addExpenseAction } from "@/lib/actions/finances";
import type { ActionResult } from "@/lib/actions/auth";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(addExpenseAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.message && <Alert variant="success">{state.message}</Alert>}
      <div>
        <Label htmlFor="expenseCategory" required>
          Category
        </Label>
        <Input id="expenseCategory" name="category" placeholder="e.g. Rent, Salaries, Data/SMS, Office supplies" required />
      </div>
      <div>
        <Label htmlFor="expenseAmount" required>
          Amount (₦)
        </Label>
        <Input id="expenseAmount" name="amount" type="number" min={1} step={0.01} required />
      </div>
      <div>
        <Label htmlFor="expenseDate" required>
          Date
        </Label>
        <Input id="expenseDate" name="expenseDate" type="date" defaultValue={today} required />
      </div>
      <div>
        <Label htmlFor="expenseDescription">Description</Label>
        <Textarea id="expenseDescription" name="description" />
      </div>
      <Button type="submit" size="sm" loading={pending}>
        Save Expense
      </Button>
    </form>
  );
}