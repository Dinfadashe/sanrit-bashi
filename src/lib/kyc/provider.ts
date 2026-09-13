import "server-only";

export interface NinLookupResult {
  valid: boolean;
  fullName?: string;
  dateOfBirth?: string; // ISO yyyy-mm-dd
  phone?: string;
  raw?: unknown; // full provider response, kept for audit/debugging
  error?: string;
}

export interface BvnLookupResult {
  valid: boolean;
  fullName?: string;
  dateOfBirth?: string;
  phone?: string;
  raw?: unknown;
  error?: string;
}

/** Known profile details, passed so a provider (or the mock) can be compared against them. Real vendors ignore this — they return their own registry data regardless. */
export interface KnownIdentity {
  fullName: string;
  dateOfBirth: string | null;
}

/**
 * The contract any KYC verification vendor must satisfy. Swap the provider
 * returned by getKycProvider() (see index.ts) to plug in a real one — no
 * other code in the app needs to change.
 */
export interface KycProvider {
  verifyNin(nin: string, known?: KnownIdentity): Promise<NinLookupResult>;
  verifyBvn(bvn: string, known?: KnownIdentity): Promise<BvnLookupResult>;
}
