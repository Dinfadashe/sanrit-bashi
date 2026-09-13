import "server-only";
import type { KycProvider, NinLookupResult, BvnLookupResult } from "./provider";

// DOJAH_ENV controls which Dojah environment is hit. Defaults to "sandbox" so
// nobody accidentally makes paid live calls before they're ready — set
// DOJAH_ENV=live in .env.local once you've tested against sandbox and are
// ready to verify real NIN/BVN numbers (this costs money per lookup).
const BASE_URL = process.env.DOJAH_ENV === "live" ? "https://api.dojah.io" : "https://sandbox.dojah.io";

function authHeaders(): Record<string, string> {
  const appId = process.env.DOJAH_APP_ID;
  const secretKey = process.env.DOJAH_SECRET_KEY;
  if (!appId || !secretKey) {
    throw new Error("DOJAH_APP_ID and DOJAH_SECRET_KEY must be set in .env.local to use the Dojah KYC provider.");
  }
  return { Authorization: secretKey, AppId: appId };
}

interface DojahEntity {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  date_of_birth?: string;
  phone_number?: string;
  phone_number1?: string;
}

function fullNameFrom(entity: DojahEntity): string {
  return [entity.first_name, entity.middle_name, entity.last_name].filter(Boolean).join(" ").trim();
}

/**
 * Real KYC provider — calls Dojah's NIN and BVN lookup APIs.
 * Docs: https://docs.dojah.io/api-reference/individual-verification/nigeria/lookup-nin
 *       https://docs.dojah.io/docs/nigeria/lookup-bvn
 *
 * Sandbox test values (only work against DOJAH_ENV=sandbox, the default):
 *   NIN: 70123456789
 *   BVN: 22222222222
 */
export class DojahKycProvider implements KycProvider {
  async verifyNin(nin: string): Promise<NinLookupResult> {
    try {
      const url = `${BASE_URL}/api/v1/kyc/nin?nin=${encodeURIComponent(nin)}`;
      const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.entity) {
        return {
          valid: false,
          error: typeof data?.error === "string" ? data.error : "NIN not found or could not be verified.",
          raw: data,
        };
      }

      const entity: DojahEntity = data.entity;
      return {
        valid: true,
        fullName: fullNameFrom(entity),
        dateOfBirth: entity.date_of_birth,
        phone: entity.phone_number,
        raw: data,
      };
    } catch {
      return { valid: false, error: "Could not reach the verification service. Please try again shortly." };
    }
  }

  async verifyBvn(bvn: string): Promise<BvnLookupResult> {
    try {
      const url = `${BASE_URL}/api/v1/kyc/bvn/full?bvn=${encodeURIComponent(bvn)}`;
      const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.entity) {
        return {
          valid: false,
          error: typeof data?.error === "string" ? data.error : "BVN not found or could not be verified.",
          raw: data,
        };
      }

      const entity: DojahEntity = data.entity;
      return {
        valid: true,
        fullName: fullNameFrom(entity),
        dateOfBirth: entity.date_of_birth,
        phone: entity.phone_number1,
        raw: data,
      };
    } catch {
      return { valid: false, error: "Could not reach the verification service. Please try again shortly." };
    }
  }
}