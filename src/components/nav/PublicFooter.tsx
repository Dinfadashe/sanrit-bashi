import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-lg font-extrabold tracking-tight text-brand-navy">
              SANRIT<span className="text-brand-green-500">BASHI</span>
            </p>
            <p className="mt-2 text-sm text-brand-slate">A product of SANRIT Business Consult.</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-navy">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-brand-slate">
              <li><Link href="/about" className="hover:text-brand-navy">About</Link></li>
              <li><Link href="/how-it-works" className="hover:text-brand-navy">How It Works</Link></li>
              <li><Link href="/contact" className="hover:text-brand-navy">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-navy">Tools</p>
            <ul className="mt-3 space-y-2 text-sm text-brand-slate">
              <li><Link href="/loan-calculator" className="hover:text-brand-navy">Loan Calculator</Link></li>
              <li><Link href="/register" className="hover:text-brand-navy">Apply for a Loan</Link></li>
              <li><Link href="/login" className="hover:text-brand-navy">Login</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-navy">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-brand-slate">
              <li><Link href="/privacy" className="hover:text-brand-navy">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-brand-navy">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-200 pt-6 text-xs text-brand-slate">
          <p>© {new Date().getFullYear()} SANRIT BASHI, a product of SANRIT Business Consult. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
