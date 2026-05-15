"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Error global de Next.js.
 * Se muestra cuando ocurre un error en el root layout o en la renderización
 * inicial de la aplicación (errores que los error boundaries normales no capturan).
 *
 * A diferencia de error.tsx, este componente DEBE incluir <html> y <body>
 * porque el layout raíz podría estar roto.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Next.js Global Error]", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Error crítico del sistema
            </h1>
            <p className="text-muted-foreground">
              La aplicación no pudo cargar correctamente. Esto suele deberse a
              un problema de configuración o conectividad.
            </p>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                Ref: {error.digest}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={reset} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Reintentar carga
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="w-full gap-2"
            >
              <Home className="w-4 h-4" />
              Volver al inicio
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Si el problema persiste, contacta soporte con el código de referencia.
          </p>
        </motion.div>
      </body>
    </html>
  );
}
