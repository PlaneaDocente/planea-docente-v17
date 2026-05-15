import { Suspense } from "react";
import SuccessClient from "./SuccessClient";

/**
 * Página de éxito post-pago con Suspense.
 * El fallback muestra un estado profesional de verificación
 * mientras Next.js hidrata el componente cliente.
 */
export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
            <p className="text-green-700 dark:text-green-300 font-medium">
              Verificando tu pago...
            </p>
            <p className="text-sm text-muted-foreground">
              Esto solo tomará unos segundos
            </p>
          </div>
        </div>
      }
    >
      <SuccessClient />
    </Suspense>
  );
}
