import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SANRIT BASHI | Your Goals. Our Support.",
    template: "%s | SANRIT BASHI",
  },
  description:
    "Apply for and manage your loan through a simple, transparent and convenient digital platform. SANRIT BASHI is a product of SANRIT Business Consult.",
  openGraph: {
    title: "SANRIT BASHI | Your Goals. Our Support.",
    description:
      "Apply for and manage your loan through a simple, transparent and convenient digital platform.",
    siteName: "SANRIT BASHI",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-brand-navy">{children}</body>
    </html>
  );
}
