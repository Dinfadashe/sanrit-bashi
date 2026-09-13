import { describe, it, expect } from "vitest";
import { calculateLoan, generateRepaymentSchedule, formatNaira } from "./finance";

describe("calculateLoan", () => {
  it("computes interest, fee and total correctly (5% flat MONTHLY interest)", () => {
    const result = calculateLoan({
      principal: 100000,
      interestRatePercent: 5, // 5% per month, flat
      processingFeeRatePercent: 1.5,
      durationMonths: 6,
    });

    // interest = 100,000 * 0.05 * 6 months = 30,000
    expect(result.interestAmount).toBe(30000);
    expect(result.processingFee).toBe(1500);
    expect(result.totalRepayment).toBe(131500);
    expect(result.monthlyRepayment).toBeCloseTo(21916.67, 2);
  });

  it("rejects zero or negative principal", () => {
    expect(() =>
      calculateLoan({ principal: 0, interestRatePercent: 10, processingFeeRatePercent: 0, durationMonths: 6 })
    ).toThrow();
  });

  it("rejects a non-integer duration", () => {
    expect(() =>
      calculateLoan({ principal: 10000, interestRatePercent: 10, processingFeeRatePercent: 0, durationMonths: 3.5 })
    ).toThrow();
  });

  it("rejects negative rates", () => {
    expect(() =>
      calculateLoan({ principal: 10000, interestRatePercent: -1, processingFeeRatePercent: 0, durationMonths: 3 })
    ).toThrow();
  });
});

describe("generateRepaymentSchedule", () => {
  it("produces installments that sum exactly to totalRepayment (no rounding drift)", () => {
    const calc = calculateLoan({
      principal: 100000,
      interestRatePercent: 10,
      processingFeeRatePercent: 1.5,
      durationMonths: 7, // deliberately odd/non-divisible duration
    });

    const schedule = generateRepaymentSchedule(calc, new Date("2026-01-15"));

    expect(schedule).toHaveLength(7);
    const sum = schedule.reduce((acc, s) => acc + s.amountDue, 0);
    expect(Math.round(sum * 100) / 100).toBe(calc.totalRepayment);
  });

  it("spaces installments one month apart", () => {
    const calc = calculateLoan({
      principal: 50000,
      interestRatePercent: 5,
      processingFeeRatePercent: 1,
      durationMonths: 3,
    });
    const schedule = generateRepaymentSchedule(calc, new Date("2026-01-01"));
    expect(schedule.map((s) => s.dueDate)).toEqual(["2026-02-01", "2026-03-01", "2026-04-01"]);
  });
});

describe("formatNaira", () => {
  it("formats amounts with the naira symbol and two decimals", () => {
    expect(formatNaira(100000)).toBe("₦100,000.00");
    expect(formatNaira(0)).toBe("₦0.00");
  });
});
