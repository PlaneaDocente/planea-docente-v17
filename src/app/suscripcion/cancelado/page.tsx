import { Suspense } from "react";
import CancelClient from "./CancelClient";

/**
 * Página de cancelación de pago.
 * Aunque CancelClient no usa searchParams de forma que requiera Suspense
 * (el hook useSearchParams está dentro del componente cliente),
 * mantenemos la estructura consistente con la página de éxito.
 */
export default function CancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950 dark:to-orange-900 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mx-auto" />
            <p className="text-red-700 dark:text-red-300 font-medium">
              Cargando...
            </p>
          </div>
        </div>
      }
    >
      <CancelClient />
    </Suspense>
  );
}
