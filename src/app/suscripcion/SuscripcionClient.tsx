"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const SuscripcionSection = dynamic(
  () => import("@/components/planea/SuscripcionSection"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-muted-foreground font-medium">Cargando planes...</p>
        </div>
      </div>
    ),
  }
);

export default function SuscripcionClient() {
  return <SuscripcionSection />;
}
