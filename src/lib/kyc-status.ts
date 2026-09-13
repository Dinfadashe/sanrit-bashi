import type { KycStatus } from "@/types/database";

/**
 * KYC is only "complete" once BOTH:
 *  - kyc_status is "verified" (NIN checked, then BVN checked against the
 *    NIN-verified identity), AND
 *  - a liveness photo has been captured.
 * Both gates are checked wherever a borrower's eligibility to apply matters
 * — the apply page (for the UI) and the loan-application server action (the
 * real enforcement, since the UI check alone could be bypassed).
 */
export function isKycComplete(profile: { kyc_status: KycStatus; liveness_captured_at: string | null } | null | undefined): boolean {
  return profile?.kyc_status === "verified" && profile?.liveness_captured_at != null;
}