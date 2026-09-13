import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminNav } from "@/components/nav/AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { admin } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AdminNav fullName={admin.full_name} role={admin.role} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
