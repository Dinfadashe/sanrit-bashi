import { getAllApplications, getAllLoansAdmin } from "@/lib/admin";
import { AdminLoansTable } from "@/components/site/AdminLoansTable";

export default async function AdminLoansPage() {
  const [applications, loans] = await Promise.all([getAllApplications(), getAllLoansAdmin()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Loans &amp; Applications</h1>
      <p className="mt-1 text-brand-slate">Review applications and manage the loan lifecycle.</p>
      <div className="mt-6">
        <AdminLoansTable applications={applications} loans={loans} />
      </div>
    </div>
  );
}
