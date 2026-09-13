import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { LoanApplicationStatus, LoanStatus, ScheduleStatus, PaymentStatus } from "@/types/database";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-sm font-medium text-brand-slate">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-brand-navy tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-brand-slate">{hint}</p>}
    </Card>
  );
}

type AnyStatus = LoanApplicationStatus | LoanStatus | ScheduleStatus | PaymentStatus | string;

const statusStyles: Record<string, string> = {
  not_submitted: "bg-slate-100 text-slate-700",
  nin_verified: "bg-blue-100 text-blue-800",
  mismatch: "bg-amber-100 text-amber-800",
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
  disbursed: "bg-indigo-100 text-indigo-800",
  active: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  verified: "bg-emerald-100 text-emerald-800",
  defaulted: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  successful: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  reversed: "bg-slate-100 text-slate-700",
};

export function StatusBadge({ status }: { status: AnyStatus }) {
  const style = statusStyles[status] ?? "bg-slate-100 text-slate-700";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
        style
      )}
    >
      {label}
    </span>
  );
}

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const styles: Record<string, string> = {
    info: "bg-brand-blue-50 border-brand-blue-100 text-brand-blue-700",
    success: "bg-emerald-50 border-emerald-100 text-emerald-800",
    warning: "bg-amber-50 border-amber-100 text-amber-800",
    error: "bg-red-50 border-red-100 text-red-800",
  };
  return (
    <div role="alert" className={clsx("rounded-xl border px-4 py-3 text-sm", styles[variant], className)}>
      {title && <p className="font-semibold mb-0.5">{title}</p>}
      <div>{children}</div>
    </div>
  );
}