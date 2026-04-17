
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CancelClient() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950 dark:to-orange-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-red-200 dark:border-red-800">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mx-auto"
            >
              <XCircle className="w-12 h-12 text-red-500" />
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">Pago Cancelado</h1>
              <p className="text-muted-foreground">
                No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.
              </p>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                💡 Si tuviste algún problema con el pago, verifica que tu tarjeta tenga fondos suficientes
                o intenta con otra tarjeta.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={() => router.push("/")} className="w-full gap-2">
                <RefreshCw className="w-4 h-4" />
                Intentar de nuevo
              </Button>
              <Button onClick={() => router.push("/")} variant="outline" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
