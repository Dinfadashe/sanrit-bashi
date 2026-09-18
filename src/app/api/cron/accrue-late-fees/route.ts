import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Invoked once daily by Vercel Cron (see vercel.json). Vercel automatically
 * sends the CRON_SECRET env var as a Bearer token on every invocation —
 * comparing against it here stops anyone else from triggering this by just
 * hitting the URL.
 *
 * Safe to call more than once on the same day (accrue_daily_late_fees() is
 * itself idempotent per day), so this can also be triggered manually from
 * the admin dashboard for testing without waiting on the schedule.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("accrue_daily_late_fees");

  if (error) {
    console.error("[cron] accrue_daily_late_fees failed:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, loansCharged: data?.length ?? 0, details: data ?? [] });
}