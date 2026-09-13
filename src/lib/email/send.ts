import "server-only";
import { getResendClient, FROM_EMAIL } from "./resend";
import {
  welcomeEmail,
  applicationSubmittedEmail,
  loanApprovedEmail,
  loanRejectedEmail,
  loanDisbursedEmail,
  paymentReceivedEmail,
  loanCompletedEmail,
  paymentReminderEmail,
} from "./templates";

async function send(to: string, subject: string, html: string) {
  const resend = getResendClient();
  if (!resend) {
    // No RESEND_API_KEY configured yet — don't crash the app, just skip sending.
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return;
  }
  await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
}

export function sendWelcomeEmail(args: { to: string; fullName: string }) {
  return send(args.to, "Welcome to SANRIT BASHI", welcomeEmail(args.fullName));
}

export function sendApplicationSubmittedEmail(args: { to: string; fullName: string; amount: number }) {
  return send(args.to, "Application received — SANRIT BASHI", applicationSubmittedEmail(args.fullName, args.amount));
}

export function sendLoanApprovedEmail(args: { to: string; fullName: string; totalRepayment: number }) {
  return send(args.to, "Your loan has been approved", loanApprovedEmail(args.fullName, args.totalRepayment));
}

export function sendLoanRejectedEmail(args: { to: string; fullName: string; reason: string }) {
  return send(args.to, "Update on your loan application", loanRejectedEmail(args.fullName, args.reason));
}

export function sendLoanDisbursedEmail(args: { to: string; fullName: string; amount: number }) {
  return send(args.to, "Your loan has been disbursed", loanDisbursedEmail(args.fullName, args.amount));
}

export function sendPaymentReceivedEmail(args: {
  to: string;
  fullName: string;
  amount: number;
  outstandingBalance: number;
}) {
  return send(
    args.to,
    "Payment received — SANRIT BASHI",
    paymentReceivedEmail(args.fullName, args.amount, args.outstandingBalance)
  );
}

export function sendLoanCompletedEmail(args: { to: string; fullName: string }) {
  return send(args.to, "Your loan is fully repaid", loanCompletedEmail(args.fullName));
}

export function sendPaymentReminderEmail(args: {
  to: string;
  fullName: string;
  amountDue: number;
  dueDate: string;
}) {
  return send(
    args.to,
    "Upcoming repayment reminder",
    paymentReminderEmail(args.fullName, args.amountDue, args.dueDate)
  );
}
