"use client";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" type="button" onClick={() => window.print()} className="print:hidden">
      Print
    </Button>
  );
}