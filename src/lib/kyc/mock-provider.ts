import "server-only";
import type { KycProvider, NinLookupResult, BvnLookupResult, KnownIdentity } from "./provider";

/**
 * MOCK PROVIDER — for development/testing only, never for production.
 *
 * There is no real NIMC/NIBSS registry behind this. It simulates a
 * verification service by "returning" whatever full name and date of birth
 * the borrower already has in their profile, as long as the submitted
 * NIN/BVN is 11 digits. This lets you test the entire KYC flow (submission,
 * matching, status transitions, admin review) without a paid vendor
 * account.
 *
 * Two things are simulated for testing the failure paths:
 *   - a NIN/BVN ending in "0000" always comes back invalid/not found
 *   - a NIN/BVN ending in "9999" comes back valid but with a DIFFERENT name,
 *     so you can see the mismatch-review path
 */
export class MockKycProvider implements KycProvider {
  async verifyNin(nin: string, known?: KnownIdentity): Promise<NinLookupResult> {
    return simulate(nin, known);
  }

  async verifyBvn(bvn: string, known?: KnownIdentity): Promise<BvnLookupResult> {
    return simulate(bvn, known);
  }
}

function simulate(id: string, known?: KnownIdentity): NinLookupResult {
  if (!/^\d{11}$/.test(id)) {
    return { valid: false, error: "Must be exactly 11 digits." };
  }
  if (id.endsWith("0000")) {
    return { valid: false, error: "No record found for this number (simulated)." };
  }
  if (id.endsWith("9999")) {
    return {
      valid: true,
      fullName: "MISMATCH TEST NAME",
      dateOfBirth: "1990-01-01",
      raw: { mock: true, scenario: "mismatch" },
    };
  }
  return {
    valid: true,
    fullName: known?.fullName ?? "Unknown",
    dateOfBirth: known?.dateOfBirth ?? undefined,
    raw: { mock: true, scenario: "match" },
  };
}
