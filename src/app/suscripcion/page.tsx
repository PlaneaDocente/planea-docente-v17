import { Suspense } from "react";
import { Metadata } from "next";
import SuscripcionClient from "./SuscripcionClient";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Suscripción — PlaneaDocente",
  description: "Elige el plan perfecto para tu labor docente. Prueba gratis de 15 días. Compatible con la Nueva Escuela Mexicana (NEM).",
  keywords: ["suscripción", "NEM", "planeación didáctica", "SEP", "maestros", "escuela"],
};

function LoadingFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
        <p className="text-muted-foreground font-medium">Preparando planes de suscripción...</p>
      </div>
    </div>
  );
}

export default function SuscripcionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuscripcionClient />
    </Suspense>
  );
}