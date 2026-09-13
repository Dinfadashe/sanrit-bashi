import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null; // Allows the app to run without email configured yet.
  if (!client) client = new Resend(apiKey);
  return client;
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "SANRIT BASHI <noreply@sanritbashi.com>";
