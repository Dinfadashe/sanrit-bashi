"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "./auth";

export async function runLateFeeAccrualAction(): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();

  const { data, error } = await db.rpc("accrue_daily_late_fees");

  if (error) {
    return { error: error.message };
  }

  const count = data?.length ?? 0;
  revalidatePath("/admin");
  revalidatePath("/admin/loans");
  return {
    success: true,
    message: count === 0 ? "No loans currently in default — nothing charged." : `Charged late fees on ${count} loan(s).`,
  };
}