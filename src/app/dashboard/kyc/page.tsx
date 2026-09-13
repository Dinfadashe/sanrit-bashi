import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { KycForm } from "@/components/site/KycForm";
import type { ProfileRow } from "@/types/database";

export default async function KycPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("kyc_status, nin_verified_full_name, bvn_verified_full_name, kyc_notes, liveness_captured_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const p = profile as Pick<ProfileRow, "kyc_status" | "nin_verified_full_name" | "bvn_verified_full_name" | "kyc_notes" | "liveness_captured_at"> | null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy">Identity Verification (KYC)</h1>
      <p className="mt-1 text-brand-slate">
        We verify your NIN, then your BVN, then ask for a quick photo, before you can apply for a loan.
      </p>
      <div className="mt-6">
        <KycForm
          kycStatus={p?.kyc_status ?? "not_submitted"}
          ninVerifiedName={p?.nin_verified_full_name ?? null}
          bvnVerifiedName={p?.bvn_verified_full_name ?? null}
          kycNotes={p?.kyc_notes ?? null}
          livenessCaptured={p?.liveness_captured_at != null}
        />
      </div>
    </div>
  );
}