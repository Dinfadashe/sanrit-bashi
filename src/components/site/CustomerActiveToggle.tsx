"use client";

import { useActionState } from "react";
import { setCustomerActiveAction } from "@/lib/actions/admin-settings";
import type { ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export function CustomerActiveToggle({
  profileId,
  userId,
  isActive,
}: {
  profileId: string;
  userId: string;
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(setCustomerActiveAction, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const msg = isActive ? "Suspend this customer's account?" : "Reactivate this customer's account?";
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isActive" value={(!isActive).toString()} />
      <Button type="submit" variant={isActive ? "danger" : "secondary"} size="sm" loading={pending}>
        {isActive ? "Suspend Account" : "Reactivate Account"}
      </Button>
    </form>
  );
}
