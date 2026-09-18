"use client";

import { useActionState } from "react";
import { runLateFeeAccrualAction } from "@/lib/actions/late-fees";
import type { ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function RunLateFeeAccrualButton() {
  const [state, formAction, pending] = useActionState(runLateFeeAccrualAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.message && <Alert variant="success">{state.message}</Alert>}
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        Run Late Fee Check Now
      </Button>
    </form>
  );
}