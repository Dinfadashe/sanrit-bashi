"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getKycProvider } from "@/lib/kyc";
import { sniffFileType } from "@/lib/file-validation";
import type { ActionResult } from "./auth";

/** Loose match: case/whitespace-insensitive, ignores punctuation, checks the name parts overlap substantially. */
function namesRoughlyMatch(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .sort();
  const partsA = normalize(a);
  const partsB = normalize(b);
  if (partsA.length === 0 || partsB.length === 0) return false;
  const overlap = partsA.filter((p) => partsB.includes(p)).length;
  return overlap >= Math.min(partsA.length, partsB.length) - 1 || overlap >= 2;
}


const KYC_LIMIT_MESSAGE =
  "Too many verification attempts. Please try again in 24 hours, or contact support if you need help.";

/**
 * Each NIN/BVN check costs real money on a live Dojah account, and the
 * forms are open to any registered user — so cap attempts per user.
 * Atomic in the database (see consume_kyc_attempt in migration 0012).
 */
async function consumeKycAttempt(userId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db.rpc("consume_kyc_attempt", { p_user_id: userId });
  return data === true;
}

export async function submitNinAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const nin = String(formData.get("nin") ?? "").trim();
  if (!/^\d{11}$/.test(nin)) {
    return { error: "NIN must be exactly 11 digits." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, date_of_birth")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) return { error: "Complete your profile before submitting KYC." };

  if (!(await consumeKycAttempt(user.id))) {
    return { error: KYC_LIMIT_MESSAGE };
  }

  const provider = getKycProvider();
  const result = await provider.verifyNin(nin, {
    fullName: profile.full_name,
    dateOfBirth: profile.date_of_birth,
  });

  const db = createAdminClient();

  if (!result.valid) {
    await db
      .from("profiles")
      .update({ nin, kyc_status: "failed", kyc_notes: result.error ?? "NIN could not be verified." })
      .eq("user_id", user.id);
    revalidatePath("/dashboard/kyc");
    return { error: result.error ?? "This NIN could not be verified. Please check the number and try again." };
  }

  const matches = result.fullName ? namesRoughlyMatch(result.fullName, profile.full_name) : false;

  if (!matches) {
    await db
      .from("profiles")
      .update({
        nin,
        kyc_status: "mismatch",
        kyc_notes: `NIN verified name "${result.fullName}" does not match profile name "${profile.full_name}".`,
      })
      .eq("user_id", user.id);
    revalidatePath("/dashboard/kyc");
    return {
      error:
        "The name on this NIN doesn't match your profile name. This has been flagged for review — an admin will follow up, or you can correct your profile name to match your ID.",
    };
  }

  await db
    .from("profiles")
    .update({
      nin,
      nin_verified_at: new Date().toISOString(),
      nin_verified_full_name: result.fullName,
      nin_verified_date_of_birth: result.dateOfBirth ?? null,
      kyc_status: "nin_verified",
      kyc_notes: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/dashboard/kyc");
  return { success: true };
}

export async function submitBvnAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const bvn = String(formData.get("bvn") ?? "").trim();
  if (!/^\d{11}$/.test(bvn)) {
    return { error: "BVN must be exactly 11 digits." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, kyc_status, nin_verified_full_name, nin_verified_date_of_birth")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) return { error: "Complete your profile before submitting KYC." };
  if (profile.kyc_status !== "nin_verified") {
    return { error: "Verify your NIN first before submitting your BVN." };
  }

  if (!(await consumeKycAttempt(user.id))) {
    return { error: KYC_LIMIT_MESSAGE };
  }

  const provider = getKycProvider();
  const result = await provider.verifyBvn(bvn, {
    fullName: profile.nin_verified_full_name ?? "",
    dateOfBirth: profile.nin_verified_date_of_birth,
  });

  const db = createAdminClient();

  if (!result.valid) {
    await db
      .from("profiles")
      .update({ bvn, kyc_notes: result.error ?? "BVN could not be verified." })
      .eq("user_id", user.id);
    revalidatePath("/dashboard/kyc");
    return { error: result.error ?? "This BVN could not be verified. Please check the number and try again." };
  }

  // Cross-check against the NIN-verified identity — not the raw profile input.
  const matches =
    result.fullName && profile.nin_verified_full_name
      ? namesRoughlyMatch(result.fullName, profile.nin_verified_full_name)
      : false;

  if (!matches) {
    await db
      .from("profiles")
      .update({
        bvn,
        kyc_status: "mismatch",
        kyc_notes: `BVN verified name "${result.fullName}" does not match NIN-verified name "${profile.nin_verified_full_name}".`,
      })
      .eq("user_id", user.id);
    revalidatePath("/dashboard/kyc");
    return {
      error:
        "The name on this BVN doesn't match your verified NIN details. This has been flagged for admin review.",
    };
  }

  await db
    .from("profiles")
    .update({
      bvn,
      bvn_verified_at: new Date().toISOString(),
      bvn_verified_full_name: result.fullName,
      bvn_verified_date_of_birth: result.dateOfBirth ?? null,
      kyc_status: "verified",
      kyc_notes: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/dashboard/kyc");
  revalidatePath("/dashboard/apply");
  return { success: true };
}

/** Admin manual override — for a flagged mismatch that's actually fine (e.g. a missing middle name), or a provider outage. */
export async function adminOverrideKycAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { admin } = await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? ""); // "verified" | "failed"
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (decision !== "verified" && decision !== "failed") {
    return { error: "Invalid decision." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("profiles")
    .update({ kyc_status: decision, kyc_reviewed_by: admin.id, kyc_notes: notes })
    .eq("id", profileId);

  if (error) return { error: "Could not update KYC status." };

  await db.from("audit_logs").insert({
    admin_id: admin.id,
    user_id: userId,
    action: "kyc_reviewed",
    entity_type: "profile",
    entity_id: profileId,
    description: `Manually set KYC status to "${decision}"${notes ? `: ${notes}` : ""}`,
  });

  revalidatePath(`/admin/customers/${profileId}`);
  return { success: true };
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Stores a borrower's captured selfie (see LivenessCapture.tsx) in the
 * private kyc-photos storage bucket and records when it was taken.
 *
 * This is a photo capture, not certified biometric liveness detection — see
 * the comment on profiles.liveness_photo_path in migration 0005 for what
 * this does and doesn't prove.
 *
 * Called directly from a client component (not via a <form action>, since
 * the photo comes from a canvas capture, not a native file input) — that's
 * fine, Server Actions are callable as plain async functions either way.
 */
export async function submitLivenessPhotoAction(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in." };

  const photo = formData.get("photo");
  if (!(photo instanceof File)) {
    return { error: "No photo was received. Please try capturing it again." };
  }
  if (photo.size > MAX_PHOTO_BYTES) {
    return { error: "Photo is too large. Please try again." };
  }

  // Check the actual file bytes, not the client-reported type (File.type is
  // just a label the browser sends — fully attacker-controlled). Our own
  // capture component always produces JPEG, so that's the only type
  // legitimately expected here.
  const sniffed = await sniffFileType(photo);
  if (sniffed !== "image/jpeg") {
    return { error: "That doesn't look like a valid photo. Please try capturing it again." };
  }

  const db = createAdminClient();
  const path = `${user.id}/${Date.now()}.jpg`;

  const { error: uploadError } = await db.storage.from("kyc-photos").upload(path, photo, {
    contentType: sniffed,
    upsert: true,
  });

  if (uploadError) {
    return { error: "Could not save your photo. Please try again." };
  }

  await db
    .from("profiles")
    .update({ liveness_photo_path: path, liveness_captured_at: new Date().toISOString() })
    .eq("user_id", user.id);

  revalidatePath("/dashboard/kyc");
  revalidatePath("/dashboard/apply");
  return { success: true };
}