import { formatNaira } from "@/lib/finance";
import { emailLayout, escapeHtml as esc } from "./layout";

const p = (text: string) => `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">${text}</p>`;
const heading = (text: string) =>
  `<h1 style="margin:0 0 16px 0;font-size:20px;color:#0f172a;">${text}</h1>`;

export function welcomeEmail(fullName: string) {
  return emailLayout({
    title: "Welcome to SANRIT BASHI",
    bodyHtml:
      heading(`Welcome, ${esc(fullName)}!`) +
      p("Your SANRIT BASHI account has been created. Complete your profile to get ready to apply for a loan.") +
      p("Your Goals. Our Support."),
  });
}

export function applicationSubmittedEmail(fullName: string, amount: number) {
  return emailLayout({
    title: "Application received",
    bodyHtml:
      heading("We've received your application") +
      p(`Hi ${esc(fullName)}, your application for ${formatNaira(amount)} is now Pending review. We'll notify you as soon as a decision is made.`),
  });
}

export function loanApprovedEmail(fullName: string, totalRepayment: number) {
  return emailLayout({
    title: "Loan approved",
    bodyHtml:
      heading("Your loan has been approved") +
      p(`Congratulations, ${esc(fullName)}! Your loan has been approved with a total repayment of ${formatNaira(totalRepayment)}. Disbursement details will follow shortly.`),
  });
}

export function loanRejectedEmail(fullName: string, reason: string) {
  return emailLayout({
    title: "Application update",
    bodyHtml:
      heading("Update on your application") +
      p(`Hi ${esc(fullName)}, unfortunately your loan application was not approved this time.`) +
      p(`<strong>Reason:</strong> ${esc(reason)}`),
  });
}

export function loanDisbursedEmail(fullName: string, amount: number) {
  return emailLayout({
    title: "Loan disbursed",
    bodyHtml:
      heading("Your loan has been disbursed") +
      p(`Hi ${esc(fullName)}, ${formatNaira(amount)} has been disbursed to you. Your repayment schedule is now active on your dashboard.`),
  });
}

export function paymentReceivedEmail(fullName: string, amount: number, outstandingBalance: number) {
  return emailLayout({
    title: "Payment received",
    bodyHtml:
      heading("We've received your payment") +
      p(`Hi ${esc(fullName)}, we received your payment of ${formatNaira(amount)}. Your outstanding balance is now ${formatNaira(outstandingBalance)}.`),
  });
}

export function loanCompletedEmail(fullName: string) {
  return emailLayout({
    title: "Loan fully repaid",
    bodyHtml:
      heading("Your loan is fully repaid") +
      p(`Congratulations, ${esc(fullName)}! Your loan has been fully repaid and is now marked complete. Thank you for banking with SANRIT BASHI.`),
  });
}

export function paymentReminderEmail(fullName: string, amountDue: number, dueDate: string) {
  return emailLayout({
    title: "Upcoming repayment reminder",
    bodyHtml:
      heading("Your repayment is coming up") +
      p(`Hi ${esc(fullName)}, a repayment of ${formatNaira(amountDue)} is due on ${esc(dueDate)}. Please ensure funds are available.`),
  });
}
