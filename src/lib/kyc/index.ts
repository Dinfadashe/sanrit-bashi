import "server-only";
import type { KycProvider } from "./provider";
import { MockKycProvider } from "./mock-provider";
import { DojahKycProvider } from "./dojah-provider";

/**
 * Returns the KYC provider currently in use.
 *
 * Uses Dojah automatically once DOJAH_APP_ID and DOJAH_SECRET_KEY are set in
 * .env.local. Falls back to the mock provider if they're not set yet, so the
 * app keeps working during setup rather than crashing.
 *
 * Defaults to Dojah's SANDBOX environment (DOJAH_ENV unset or "sandbox") —
 * set DOJAH_ENV=live once you've tested and are ready for real, billed
 * lookups against real NIN/BVN numbers.
 */
export function getKycProvider(): KycProvider {
  if (process.env.DOJAH_APP_ID && process.env.DOJAH_SECRET_KEY) {
    return new DojahKycProvider();
  }
  return new MockKycProvider();
}

export * from "./provider";