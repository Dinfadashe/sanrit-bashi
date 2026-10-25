"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  if (fullName.length > 100) {
    return { error: "Full name is too long." };
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
    // Logged server-side only. Supabase's raw error can reveal whether an
    // email is already registered (user enumeration) — never forward it
    // verbatim to the client, regardless of what it says.
    console.error("[register] signUp failed:", error.status, error.message);
    return {
      error:
        "Could not create your account with these details. If you already have an account, try logging in or resetting your password instead.",
    };
  }

  // When the email already belongs to an account, Supabase returns a
  // placeholder user with no identities instead of an error (so the response
  // doesn't reveal that the account exists). Respond exactly as we would for
  // a new signup, but do nothing else — no profile, and crucially no
  // "welcome" email, which would otherwise let anyone trigger emails to an
  // existing user's inbox with text of their choosing.
  const isExistingAccount = Array.isArray(data.user?.identities) && data.user.identities.length === 0;

  const userId = data.user?.id;
  if (userId && !isExistingAccount) {
    // Created with the service role, not the visitor's own session: with
    // email confirmation on there IS no session yet (so a session-based
    // insert silently fails), and the profile — including the recorded
    // terms acceptance — must come from the server, never from the browser.
    const admin = createAdminClient();
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId,
      full_name: fullName,
      email,
      phone,
      terms_accepted_at: new Date().toISOString(),
    });
    if (profileError && profileError.code !== "23505") {
      console.error("[register] profile creation failed:", profileError.message);
    }

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