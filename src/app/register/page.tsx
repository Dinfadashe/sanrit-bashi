"use client";

import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import { registerAction, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Card";

const initialState: ActionResult = {};

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/">
            <Image src="/logo.png" alt="SANRIT BASHI" width={64} height={64} className="h-14 w-14 object-contain" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-brand-navy">Create your account</h1>
          <p className="mt-1 text-sm text-brand-slate">It only takes a minute.</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {state?.error && <Alert variant="error">{state.error}</Alert>}

          <div>
            <Label htmlFor="fullName" required>
              Full name
            </Label>
            <Input id="fullName" name="fullName" type="text" autoComplete="name" required />
          </div>

          <div>
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>

          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="080..." />
          </div>

          <div>
            <Label htmlFor="password" required>
              Password
            </Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </div>

          <div>
            <Label htmlFor="confirmPassword" required>
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <Button type="submit" fullWidth loading={pending}>
            Create account
          </Button>

          <p className="text-center text-sm text-brand-slate">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-blue-500 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
