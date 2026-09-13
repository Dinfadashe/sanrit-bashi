import { getAllCustomers } from "@/lib/admin";
import { AdminCustomersTable } from "@/components/site/AdminCustomersTable";

export default async function AdminCustomersPage() {
  const customers = await getAllCustomers();

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Customers</h1>
      <p className="mt-1 text-brand-slate">All registered borrowers.</p>
      <div className="mt-6">
        <AdminCustomersTable customers={customers} />
      </div>
    </div>
  );
}
