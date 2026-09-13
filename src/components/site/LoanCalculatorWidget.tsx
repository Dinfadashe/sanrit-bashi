"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateLoan, formatNaira } from "@/lib/finance";
import type { LoanProductRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Field";

export function LoanCalculatorWidget({
  product,
  onChange,
}: {
  product: LoanProductRow;
  /** Called with the live calculation whenever inputs change — used by the application flow. */
  onChange?: (args: { amount: number; duration: number; result: ReturnType<typeof calculateLoan> | null }) => void;
}) {
  const [amount, setAmount] = useState(product.minimum_amount);
  const [duration, setDuration] = useState(product.minimum_duration);

  // Pure calculation only — no side effects here. useMemo runs during render,
  // so calling a parent's setState (via onChange) from inside it is invalid
  // and triggers "Cannot update a component while rendering a different
  // component." The result is computed here; telling the parent about it
  // happens separately below, in a useEffect (after render completes).
  const result = useMemo(() => {
    try {
      return calculateLoan({
        principal: amount,
        interestRatePercent: product.interest_rate,
        processingFeeRatePercent: product.processing_fee_rate,
        durationMonths: duration,
      });
    } catch {
      return null;
    }
  }, [amount, duration, product]);

  useEffect(() => {
    onChange?.({ amount, duration, result });
    // onChange intentionally omitted: including it would re-run this on every
    // parent render (most callers pass an inline function), we only care
    // about amount/duration/result actually changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, duration, result]);

  const amountOutOfRange = amount < product.minimum_amount || amount > product.maximum_amount;
  const durationOutOfRange = duration < product.minimum_duration || duration > product.maximum_duration;

  return (
    <Card>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="calc-amount">Loan amount</Label>
          <Input
            id="calc-amount"
            type="number"
            min={product.minimum_amount}
            max={product.maximum_amount}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
          />
          <input
            type="range"
            className="mt-3 w-full accent-brand-blue-500"
            min={product.minimum_amount}
            max={product.maximum_amount}
            step={1000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            aria-label="Loan amount slider"
          />
          <p className="mt-1 text-xs text-brand-slate">
            Between {formatNaira(product.minimum_amount)} and {formatNaira(product.maximum_amount)}
          </p>
          {amountOutOfRange && <p className="mt-1 text-xs text-red-600">Amount is outside the allowed range.</p>}
        </div>

        <div>
          <Label htmlFor="calc-duration">Loan duration (months)</Label>
          <Input
            id="calc-duration"
            type="number"
            min={product.minimum_duration}
            max={product.maximum_duration}
            step={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 0)}
          />
          <input
            type="range"
            className="mt-3 w-full accent-brand-blue-500"
            min={product.minimum_duration}
            max={product.maximum_duration}
            step={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            aria-label="Loan duration slider"
          />
          <p className="mt-1 text-xs text-brand-slate">
            Between {product.minimum_duration} and {product.maximum_duration} months
          </p>
          {durationOutOfRange && <p className="mt-1 text-xs text-red-600">Duration is outside the allowed range.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 sm:p-5">
        <p className="text-sm font-semibold text-brand-navy">How your repayment is calculated</p>
        {result ? (
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <Row label="Principal" value={formatNaira(result.principal)} />
            <Row label={`Interest (${product.interest_rate}%/month × ${duration}mo)`} value={formatNaira(result.interestAmount)} />
            <Row label={`Processing fee (${product.processing_fee_rate}%)`} value={formatNaira(result.processingFee)} />
            <Row label="Total repayment" value={formatNaira(result.totalRepayment)} emphasize />
            <Row label="Monthly repayment" value={formatNaira(result.monthlyRepayment)} emphasize />
          </dl>
        ) : (
          <p className="mt-2 text-sm text-brand-slate">Enter a valid amount and duration to see your breakdown.</p>
        )}
      </div>
    </Card>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-brand-slate">{label}</dt>
      <dd className={emphasize ? "font-bold text-brand-navy" : "font-medium text-brand-navy"}>{value}</dd>
    </div>
  );
}