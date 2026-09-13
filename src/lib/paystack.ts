import "server-only";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY must be set in .env.local to accept Paystack payments.");
  }
  return key;
}

export interface InitializeTransactionResult {
  ok: boolean;
  authorizationUrl?: string;
  reference?: string;
  error?: string;
}

/**
 * Starts a Paystack hosted-checkout transaction. Returns the URL to redirect
 * the borrower to. The loan_id is embedded in metadata so the webhook (the
 * source of truth — see /api/webhooks/paystack) knows which loan this
 * payment belongs to once Paystack confirms it succeeded.
 */
export async function initializeTransaction(args: {
  email: string;
  amountNaira: number;
  loanId: string;
  userId: string;
  callbackUrl: string;
}): Promise<InitializeTransactionResult> {
  try {
    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: args.email,
        amount: Math.round(args.amountNaira * 100), // Paystack expects kobo
        callback_url: args.callbackUrl,
        metadata: { loan_id: args.loanId, user_id: args.userId },
      }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.status) {
      return { ok: false, error: data?.message ?? "Could not start the payment. Please try again." };
    }

    return { ok: true, authorizationUrl: data.data.authorization_url, reference: data.data.reference };
  } catch {
    return { ok: false, error: "Could not reach Paystack. Please try again shortly." };
  }
}