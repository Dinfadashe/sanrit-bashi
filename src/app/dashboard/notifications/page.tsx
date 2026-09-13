import { requireUser } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications = (data as NotificationRow[]) ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-navy">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" size="sm" variant="outline">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      <Card className="mt-6" padded={false}>
        {notifications.length === 0 ? (
          <p className="p-5 text-sm text-brand-slate">You have no notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={clsx("flex items-start justify-between gap-3 p-4 sm:p-5", !n.is_read && "bg-brand-blue-50")}
              >
                <div>
                  <p className="font-medium text-brand-navy">{n.title}</p>
                  <p className="mt-0.5 text-sm text-brand-slate">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.is_read && (
                  <form action={markNotificationReadAction.bind(null, n.id)}>
                    <button type="submit" className="whitespace-nowrap text-xs font-medium text-brand-blue-500 hover:underline">
                      Mark read
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
