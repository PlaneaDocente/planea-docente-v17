"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Página de error de Next.js (error boundary).
 * Se muestra cuando un componente cliente lanza un error no capturado.
 *
 * Incluye:
 * - Loggeo del error en consola para debug
 * - UI amigable con opción de reintentar
 * - Botón para volver al inicio
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Next.js Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            Algo salió mal
          </h1>
          <p className="text-muted-foreground">
            Ocurrió un error inesperado. Nuestro equipo ha sido notificado.
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
            Intentar de nuevo
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="w-full gap-2"
          >
            <Home className="w-4 h-4" />
            Volver al inicio
          </Button>
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="w-full gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Página anterior
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
