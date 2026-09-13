import { getActiveLoanProduct } from "@/lib/loan-product";
import { LoanSettingsForm } from "@/components/site/LoanSettingsForm";
import { Alert } from "@/components/ui/Card";

export default async function AdminLoanSettingsPage() {
  const product = await getActiveLoanProduct();

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-navy">Loan Settings</h1>
      <p className="mt-1 text-brand-slate">Configure the terms new applications will use.</p>

      <div className="mt-6">
        {product ? <LoanSettingsForm product={product} /> : <Alert variant="warning">No loan product configured yet.</Alert>}
      </div>
    </div>
  );
}
