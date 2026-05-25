"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Star,
  Loader2,
  CreditCard,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "done" | "error";

export default function SuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");

  const [status, setStatus] = useState<Status>("loading");
  const [planName, setPlanName] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // ✅ Polling con backoff exponencial (1s, 1.5s, 2.25s, ... hasta 10s)
  const pollSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("No active session");
      }

      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("plan_id, estado")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (sub && (sub.estado === "active" || sub.estado === "trialing")) {
        // ✅ Éxito: mostrar plan y estado
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("nombre")
          .eq("id", sub.plan_id)
          .maybeSingle();
        setPlanName(plan?.nombre ?? null);
        setSubscriptionStatus(sub.estado);
        setStatus("done");
        return;
      }

      // Si aún no está activa, reintentar con backoff
      if (retryCountRef.current < 12) {
        const delay = Math.min(1000 * Math.pow(1.3, retryCountRef.current), 10000);
        retryCountRef.current += 1;
        timeoutRef.current = setTimeout(pollSubscription, delay);
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("[SuccessClient] Poll error:", err);
      if (retryCountRef.current < 12) {
        const delay = Math.min(1000 * Math.pow(1.3, retryCountRef.current), 10000);
        retryCountRef.current += 1;
        timeoutRef.current = setTimeout(pollSubscription, delay);
      } else {
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    // Iniciar polling al montar el componente
    pollSubscription();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pollSubscription]);

  // Redirección automática al dashboard tras éxito
  useEffect(() => {
    if (status !== "done") return;
    const timer = setTimeout(() => router.push("/dashboard"), 5000);
    return () => clearTimeout(timer);
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl border-green-200 dark:border-green-800">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <AnimatePresence mode="wait">
              {status === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-sm font-medium">
                      Confirmando tu suscripción...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Esperando confirmación del procesador de pagos
                    </p>
                  </div>
                </motion.div>
              )}

              {status === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 py-4"
                >
                  <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      Verificación pendiente
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      No pudimos confirmar tu suscripción automáticamente.
                      Esto puede deberse a una demora en el procesador de pagos.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                    💡 Tu pago fue procesado por Stripe. Si en unos minutos no
                    ves tu plan activo en el dashboard, contacta soporte.
                  </div>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        retryCountRef.current = 0;
                        setStatus("loading");
                        pollSubscription();
                      }}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reintentar verificación
                    </Button>
                    <Button onClick={() => router.push("/dashboard")} className="w-full gap-2">
                      Ir al Dashboard
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {status === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                    className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto"
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </motion.div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-green-700 dark:text-green-300">
                      ¡Pago Exitoso!
                    </h1>
                    <p className="text-muted-foreground">
                      Tu suscripción a PlaneaDocente ha sido activada correctamente.
                    </p>
                    {planName && (
                      <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full text-sm font-medium">
                        <CreditCard className="w-4 h-4" />
                        Plan {planName} activado
                      </div>
                    )}
                    {subscriptionStatus && (
                      <p className="text-xs text-muted-foreground capitalize">
                        Estado: {subscriptionStatus.replace("_", " ")}
                      </p>
                    )}
                    {sessionId && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Ref: {sessionId.slice(-12)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    {[
                      { icon: GraduationCap, text: "Acceso completo activado" },
                      { icon: Star, text: "Todas las funciones premium desbloqueadas" },
                    ].map(({ icon: Icon, text }) => (
                      <div
                        key={text}
                        className="flex items-center justify-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <Icon className="w-5 h-5 text-green-600" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-300">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Serás redirigido al dashboard en 5 segundos...
                  </p>

                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full gap-2"
                  >
                    Ir al Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}