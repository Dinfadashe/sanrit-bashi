"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { forgotPasswordAction, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);
  const params = useSearchParams();
  const sent = params.get("sent") === "1";

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {sent && (
        <Alert variant="success">
          If an account exists for that email, a reset link has been sent.
        </Alert>
      )}
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <Button type="submit" fullWidth loading={pending}>
        Send reset link
      </Button>

      <p className="text-center text-sm text-brand-slate">
        <Link href="/login" className="font-semibold text-brand-blue-500 hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <Image src="/logo.png" alt="SANRIT BASHI" width={64} height={64} className="h-14 w-14 object-contain" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-brand-navy">Reset your password</h1>
          <p className="mt-1 text-sm text-brand-slate">We&apos;ll email you a reset link.</p>
        </div>

        <Suspense fallback={<div className="h-56 rounded-2xl border border-slate-200 bg-white" />}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
