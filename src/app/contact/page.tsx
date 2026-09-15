import type { Metadata } from "next";
import { PublicShell } from "@/components/nav/PublicShell";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Contact" };

// Edit these details directly — kept in one place for easy updates.
const CONTACT = {
  businessName: "SANRIT Business Consult",
  email: "sanritbashi@gmail.com",
  phone: "+234 708 624 2715",
  address: "Jos, Plateau State, Nigeria",
};

export default function ContactPage() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">Contact Us</h1>
        <p className="mt-2 text-brand-slate">We&apos;re happy to help with any questions about your loan.</p>

        <Card className="mt-8">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-brand-slate">Business name</dt>
              <dd className="font-semibold text-brand-navy">{CONTACT.businessName}</dd>
            </div>
            <div>
              <dt className="text-brand-slate">Email</dt>
              <dd className="font-semibold text-brand-navy">
                <a href={`mailto:${CONTACT.email}`} className="hover:underline">
                  {CONTACT.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-brand-slate">Phone</dt>
              <dd className="font-semibold text-brand-navy">
                <a href={`tel:${CONTACT.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {CONTACT.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-brand-slate">Address</dt>
              <dd className="font-semibold text-brand-navy">{CONTACT.address}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </PublicShell>
  );
}