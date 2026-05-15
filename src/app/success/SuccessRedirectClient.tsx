"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

/**
 * Cliente de redirección post-pago.
 * Redirige automáticamente al flujo oficial de éxito (/suscripcion/exito)
 * o a la página de planes si no hay session_id.
 */
export default function SuccessRedirectClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sessionId) {
        router.replace(`/suscripcion/exito?session_id=${sessionId}`);
      } else {
        router.replace("/suscripcion");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <Loader2 className="w-10 h-10 text-green-500 animate-spin mx-auto" />
        <h2 className="text-xl font-semibold text-green-800 dark:text-green-300">
          Confirmando tu pago...
        </h2>
        <p className="text-sm text-muted-foreground">
          Serás redirigido automáticamente en unos segundos.
        </p>
        <button
          onClick={() => {
            if (sessionId) {
              router.push(`/suscripcion/exito?session_id=${sessionId}`);
            } else {
              router.push("/suscripcion");
            }
          }}
          className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400 hover:underline"
        >
          Ir ahora
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
