"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { logoutAction } from "@/lib/actions/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/kyc", label: "Verification" },
  { href: "/dashboard/apply", label: "Apply for Loan" },
  { href: "/dashboard/loans", label: "My Loans" },
  { href: "/dashboard/repayments", label: "Repayments" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardNav({ fullName }: { fullName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SANRIT BASHI" width={32} height={32} className="h-8 w-8 object-contain" />
          <span className="font-extrabold text-brand-navy">
            SANRIT<span className="text-brand-green-500">BASHI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm font-medium",
                pathname === link.href ? "text-brand-blue-500" : "text-brand-slate hover:text-brand-navy"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <span className="text-sm text-brand-slate">Hi, {fullName.split(" ")[0]}</span>
          <form action={logoutAction}>
            <button className="text-sm font-medium text-brand-slate hover:text-red-600" type="submit">
              Logout
            </button>
          </form>
        </div>

        <button
          type="button"
          className="p-2 text-brand-navy lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 lg:hidden">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-brand-navy hover:bg-slate-50"
              >
                {link.label}
              </Link>
            ))}
            <form action={logoutAction} className="px-3 pt-2">
              <button className="text-sm font-medium text-red-600" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}