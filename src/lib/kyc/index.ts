import "server-only";
import type { KycProvider, NinLookupResult, BvnLookupResult } from "./provider";
import { MockKycProvider } from "./mock-provider";
import { DojahKycProvider } from "./dojah-provider";

/**
 * Used when no real verification is configured in production. Refuses every
 * check instead of quietly approving it.
 */
class UnconfiguredKycProvider implements KycProvider {
  private fail(): NinLookupResult & BvnLookupResult {
    console.error(
      "[kyc] Identity verification is not configured for production — refusing to verify. " +
        "Set DOJAH_APP_ID, DOJAH_SECRET_KEY and DOJAH_ENV=live."
    );
    return { valid: false, error: "Identity verification is temporarily unavailable. Please try again later." };
  }
  async verifyNin(): Promise<NinLookupResult> {
    return this.fail();
  }
  async verifyBvn(): Promise<BvnLookupResult> {
    return this.fail();
  }
}

/**
 * Returns the KYC provider currently in use. FAILS CLOSED.
 *
 * Two test-only modes must never run against real borrowers:
 *   - the mock provider approves ANY 11-digit number as a match;
 *   - Dojah's sandbox answers a few publicly documented test NIN/BVN values
 *     with canned data, so anyone who knows them (and sets a matching
 *     profile name) could pass verification as a made-up identity.
 *
 * So in production (NODE_ENV=production, which is what Vercel uses) only
 * LIVE Dojah is accepted. Test modes are available outside production, or
 * in production only if KYC_ALLOW_TEST_MODE=true is set deliberately.
 */
export function getKycProvider(): KycProvider {
  const hasDojahKeys = Boolean(process.env.DOJAH_APP_ID && process.env.DOJAH_SECRET_KEY);
  const isLiveDojah = process.env.DOJAH_ENV === "live";
  const testModeAllowed = process.env.NODE_ENV !== "production" || process.env.KYC_ALLOW_TEST_MODE === "true";

  if (hasDojahKeys && (isLiveDojah || testModeAllowed)) {
    return new DojahKycProvider();
  }
  if (!hasDojahKeys && testModeAllowed) {
    return new MockKycProvider();
  }
  return new UnconfiguredKycProvider();
}

export * from "./provider";
