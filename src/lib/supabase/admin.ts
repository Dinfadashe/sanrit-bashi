import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. BYPASSES ROW LEVEL SECURITY.
 *
 * `import "server-only"` makes any accidental client-side import fail the build,
 * so this can never leak into the browser bundle.
 *
 * Only use this for:
 *  - Trusted server-side admin actions that have already verified `is_admin()` themselves
 *  - Calling database functions like `record_payment()` from a Route Handler / Server Action
 *
 * NEVER use this as a shortcut to skip writing an RLS policy.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
