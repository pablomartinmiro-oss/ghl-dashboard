import type { ReactNode } from "react";

export default function MiReservaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#2D2A26] font-sans antialiased">
      <div className="mx-auto max-w-2xl px-4 py-6">{children}</div>
    </div>
  );
}
