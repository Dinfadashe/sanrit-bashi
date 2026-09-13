import type { ReactNode } from "react";
import { PublicNav } from "@/components/nav/PublicNav";
import { PublicFooter } from "@/components/nav/PublicFooter";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </>
  );
}
