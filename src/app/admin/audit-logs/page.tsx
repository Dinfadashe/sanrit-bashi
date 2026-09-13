import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import type { AuditLogRow } from "@/types/database";

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (data as AuditLogRow[]) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Audit Logs</h1>
      <p className="mt-1 text-brand-slate">Every approval, rejection, disbursement, payment, and settings change.</p>

      <Card className="mt-6" padded={false}>
        {logs.length === 0 ? (
          <p className="p-5 text-sm text-brand-slate">No actions logged yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => (
              <li key={log.id} className="p-4 sm:p-5">
                <p className="text-sm font-medium capitalize text-brand-navy">{log.action.replace(/_/g, " ")}</p>
                <p className="mt-0.5 text-sm text-brand-slate">{log.description}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(log.created_at).toLocaleString()} · {log.entity_type}
                  {log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
