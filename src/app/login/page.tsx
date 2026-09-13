"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loginAction, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const params = useSearchParams();
  const justRegistered = params.get("registered") === "1";
  const justReset = params.get("reset") === "1";

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {justRegistered && (
        <Alert variant="success">Account created. Check your email to confirm, then log in.</Alert>
      )}
      {justReset && <Alert variant="success">Password updated. You can now log in.</Alert>}
      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div>
        <Label htmlFor="email" required>
          Email
        </Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password" required>
            Password
          </Label>
          <Link href="/forgot-password" className="text-xs font-medium text-brand-blue-500 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      <Button type="submit" fullWidth loading={pending}>
        Log in
      </Button>

      <p className="text-center text-sm text-brand-slate">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-brand-blue-500 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <Image src="/logo.png" alt="SANRIT BASHI" width={64} height={64} className="h-14 w-14 object-contain" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-brand-navy">Welcome back</h1>
          <p className="mt-1 text-sm text-brand-slate">Log in to manage your loan.</p>
        </div>

        <Suspense fallback={<div className="h-64 rounded-2xl border border-slate-200 bg-white" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
