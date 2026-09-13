import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * SANRIT BASHI loan model: flat MONTHLY interest (not a one-time rate).
 *
 *   interestAmount   = principal * (monthlyInterestRatePercent / 100) * durationMonths
 *   processingFee    = principal * (processingFeeRatePercent / 100)
 *   totalRepayment   = principal + interestAmount + processingFee
 *   periodicPayment  = totalRepayment / durationMonths   (equal monthly installments)
 *
 * e.g. ₦100,000 at 5% monthly for 6 months = ₦100,000 * 0.05 * 6 = ₦30,000 interest.
 * This is a flat rate on the original principal each month, not compounding/reducing-balance.
 *
 * This is the ONLY place loan math happens. The UI calls this to preview figures;
 * the server re-runs the exact same function before writing a loan_application row,
 * so a tampered client-side number can never reach the database.
 */

export interface LoanCalculationInput {
  principal: number;
  /** Flat interest rate charged per month (e.g. 5 for 5% monthly). */
  interestRatePercent: number;
  processingFeeRatePercent: number;
  durationMonths: number;
}

export interface LoanCalculationResult {
  principal: number;
  interestRatePercent: number;
  processingFeeRatePercent: number;
  durationMonths: number;
  interestAmount: number;
  processingFee: number;
  totalRepayment: number;
  monthlyRepayment: number;
}

export function calculateLoan(input: LoanCalculationInput): LoanCalculationResult {
  const { principal, interestRatePercent, processingFeeRatePercent, durationMonths } = input;

  if (!(principal > 0)) throw new Error("Principal must be greater than zero.");
  if (!(durationMonths > 0) || !Number.isInteger(durationMonths)) {
    throw new Error("Duration must be a whole number of months greater than zero.");
  }
  if (interestRatePercent < 0 || processingFeeRatePercent < 0) {
    throw new Error("Rates cannot be negative.");
  }

  const p = new Decimal(principal);
  const interestAmount = p.times(interestRatePercent).dividedBy(100).times(durationMonths);
  const processingFee = p.times(processingFeeRatePercent).dividedBy(100);
  const totalRepayment = p.plus(interestAmount).plus(processingFee);
  const monthlyRepayment = totalRepayment.dividedBy(durationMonths);

  return {
    principal: round2(p),
    interestRatePercent,
    processingFeeRatePercent,
    durationMonths,
    interestAmount: round2(interestAmount),
    processingFee: round2(processingFee),
    totalRepayment: round2(totalRepayment),
    monthlyRepayment: round2(monthlyRepayment),
  };
}

export interface ScheduleInstallment {
  installmentNumber: number;
  dueDate: string; // ISO date (yyyy-mm-dd)
  amountDue: number;
}

/**
 * Generates an equal-installment monthly repayment schedule.
 * Any rounding remainder from dividing totalRepayment evenly is absorbed into the
 * FINAL installment, so the sum of all installments always exactly equals totalRepayment
 * (never leaves a stray kobo unaccounted for).
 */
export function generateRepaymentSchedule(
  calculation: Pick<LoanCalculationResult, "totalRepayment" | "durationMonths">,
  startDate: Date = new Date()
): ScheduleInstallment[] {
  const { totalRepayment, durationMonths } = calculation;
  const total = new Decimal(totalRepayment);
  const base = total.dividedBy(durationMonths).toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const installments: ScheduleInstallment[] = [];

  let runningTotal = new Decimal(0);

  for (let i = 1; i <= durationMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const isLast = i === durationMonths;
    const amount = isLast ? total.minus(runningTotal) : base;
    runningTotal = runningTotal.plus(amount);

    installments.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().slice(0, 10),
      amountDue: round2(amount),
    });
  }

  return installments;
}

function round2(value: Decimal): number {
  return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Formats a number as Nigerian Naira, e.g. formatNaira(100000) -> "₦100,000.00" */
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
