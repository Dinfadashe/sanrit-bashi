import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifies the current request belongs to a signed-in, active admin user.
 * Reads admin_users through the normal (RLS-respecting) server client — a
 * non-admin can only ever see their own (non-existent) admin row, so this
 * check cannot be spoofed from the client.
 *
 * Use this at the top of every /admin Server Action and Route Handler, and inside
 * any data helper that uses the service-role client. Memoised per request, so
 * calling it in several places costs one lookup. Never trust a role passed in
 * from the client.
 */
export const requireAdmin = cache(async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: admin } = await supabase
    .from("admin_users")
    .select("id, user_id, full_name, email, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!admin) {
    redirect("/dashboard");
  }

  return { user, admin };
});

/** Verifies the current request belongs to any signed-in borrower. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
