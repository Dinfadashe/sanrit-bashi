import Image from "next/image";

export function PrintHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-6 hidden items-center gap-3 border-b border-slate-300 pb-4 print:flex">
      <Image src="/logo.png" alt="SANRIT BASHI" width={40} height={37} className="h-10 w-10 object-contain" />
      <div>
        <p className="text-lg font-extrabold text-brand-navy">
          SANRIT<span className="text-brand-green-600">BASHI</span>
        </p>
        <p className="text-xs text-brand-slate">{subtitle} · Printed {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}