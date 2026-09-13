"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import type { ProfileRow } from "@/types/database";
import { clsx } from "clsx";

export function AdminCustomersTable({ customers }: { customers: ProfileRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <Input
        placeholder="Search by name, email or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />
      <Card padded={false}>
        {filtered.length === 0 ? (
          <p className="p-5 text-sm text-brand-slate">No matching customers.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/customers/${c.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 sm:p-5">
                  <div>
                    <p className="font-medium text-brand-navy">{c.full_name}</p>
                    <p className="text-xs text-brand-slate">{c.email} · {c.phone ?? "no phone"}</p>
                  </div>
                  <span className={clsx("text-xs font-semibold", c.is_active ? "text-emerald-600" : "text-red-600")}>
                    {c.is_active ? "Active" : "Suspended"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
