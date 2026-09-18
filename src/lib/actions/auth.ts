"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email/send";

export interface ActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function registerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const termsAccepted = formData.get("termsAccepted") === "on";

  if (!fullName || !email || !password) {
    return { error: "Full name, email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }
  if (!termsAccepted) {
    return { error: "You must read and agree to the Terms and Conditions to create an account." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback`,
      data: { full_name: fullName, phone },
    },
  });

  if (error) {
    return { error: error.message };
  }

  const userId = data.user?.id;
  if (userId) {
    await supabase.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      email,
      phone,
      terms_accepted_at: new Date().toISOString(),
    });

    await sendWelcomeEmail({ to: email, fullName }).catch(() => {
      // Email failures should never block registration.
    });
  }

  // If Supabase email confirmation is off, a session exists immediately.
  if (data.session) {
    redirect("/dashboard/profile");
  }

  redirect("/login?registered=1");
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Logged server-side (visible in Vercel's function logs) so the real
    // cause is diagnosable — the client-facing message stays generic for
    // most cases (avoids confirming whether an account exists), but we DO
    // surface "email not confirmed" specifically since that's common,
    // actionable, and not meaningfully more sensitive to reveal.
    console.error("[login] signInWithPassword failed:", error.status, error.message);

    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error: "Please confirm your email address first — check your inbox (and spam folder) for the confirmation link.",
      };
    }

    return { error: "Invalid email or password." };
  }

  // Route to admin or borrower dashboard depending on role.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: admin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (admin) {
      redirect("/admin");
    }
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  // Always report success — never reveal whether an email is registered.
  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/login?reset=1");
}