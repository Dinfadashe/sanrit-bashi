import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const baseFieldClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-slate-400 focus:border-brand-blue-500 focus:outline-none focus:ring-2 focus:ring-brand-blue-100 disabled:bg-slate-50 disabled:text-slate-400";

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-brand-navy">
      {children}
      {required && <span className="ml-0.5 text-red-600">*</span>}
    </label>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1.5 text-sm text-red-600">
      {children}
    </p>
  );
}

export function FieldHint({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-sm text-brand-slate">{children}</p>;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(baseFieldClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(baseFieldClasses, "min-h-28", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(baseFieldClasses, "appearance-none bg-no-repeat", className)} {...props}>
      {children}
    </select>
  );
}
