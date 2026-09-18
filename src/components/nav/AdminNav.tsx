"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clsx } from "clsx";
import { logoutAction } from "@/lib/actions/auth";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/loans", label: "Loans" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/repayments", label: "Repayments" },
  { href: "/admin/finances", label: "Finances" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings/loans", label: "Settings" },
];

export function AdminNav({ fullName, role }: { fullName: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-brand-navy print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo.png" alt="SANRIT BASHI" width={30} height={30} className="h-7 w-7 object-contain" />
          <span className="font-bold text-white">
            SANRIT BASHI <span className="font-normal text-slate-400">Admin</span>
          </span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "text-sm font-medium",
                pathname === link.href ? "text-white" : "text-slate-400 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <span className="text-sm text-slate-400">
            {fullName} · <span className="capitalize">{role.replace("_", " ")}</span>
          </span>
          <form action={logoutAction}>
            <button className="text-sm font-medium text-slate-400 hover:text-red-400" type="submit">
              Logout
            </button>
          </form>
        </div>

        <button
          type="button"
          className="p-2 text-white lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-700 lg:hidden">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ))}
            <form action={logoutAction} className="px-3 pt-2">
              <button className="text-sm font-medium text-red-400" type="submit">
                Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}