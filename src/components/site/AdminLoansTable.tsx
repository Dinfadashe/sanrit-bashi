"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatNaira } from "@/lib/finance";
import { Card, StatusBadge } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import type { LoanApplicationRow, LoanRow } from "@/types/database";

type Row =
  | ({ kind: "application" } & LoanApplicationRow)
  | ({ kind: "loan" } & LoanRow);

export function AdminLoansTable({ applications, loans }: { applications: LoanApplicationRow[]; loans: LoanRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const rows: Row[] = useMemo(() => {
    const appRows: Row[] = applications
      // Approved applications become loans — don't show them twice.
      .filter((a) => a.status !== "approved")
      .map((a) => ({ kind: "application", ...a }));
    const loanRows: Row[] = loans.map((l) => ({ kind: "loan", ...l }));
    return [...appRows, ...loanRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [applications, loans]);

  const filtered = rows.filter((row) => {
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const amount = "amount" in row ? row.amount : row.principal_amount;
    const matchesSearch = search === "" || row.id.toLowerCase().includes(search.toLowerCase()) || String(amount).includes(search);
    return matchesStatus && matchesSearch;
  });

  const allStatuses = Array.from(new Set(rows.map((r) => r.status)));

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search by ID or amount…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-xs">
          <option value="all">All statuses</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <p className="p-5 text-sm text-brand-slate">No matching records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-brand-slate">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Date</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                  <th className="px-4 py-3 sm:px-5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const amount = "amount" in row ? row.amount : row.principal_amount;
                  const href = row.kind === "application" ? `/admin/loans/${row.id}` : `/admin/loans/${row.id}?type=loan`;
                  return (
                    <tr key={`${row.kind}-${row.id}`} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 capitalize sm:px-5">{row.kind}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-brand-navy sm:px-5">
                        {formatNaira(amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        {new Date(row.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right sm:px-5">
                        <Link href={href} className="font-medium text-brand-blue-500 hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
