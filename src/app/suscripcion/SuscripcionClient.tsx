"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
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

type Status = "loading" | "verifying" | "done" | "error";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id");

  const [status, setStatus] = useState<Status>("loading");
  const [planName, setPlanName] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [rawUrl, setRawUrl] = useState<string>("");

  // Capturar URL completa para debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      setRawUrl(window.location.href);
    }
  }, []);

  /**
   * Verifica la sesión de pago:
   * 1. Primero consulta Stripe directamente via API
   * 2. Si Stripe confirma pago, crea suscripción en Supabase
   * 3. Si falla, consulta Supabase como fallback
   */
  const verifyPayment = useCallback(async () => {
    if (!sessionId) {
      // Esperar un momento por si searchParams tarda en hidratarse
      console.log("[SuccessClient] sessionId no disponible aún, esperando...");
      return;
    }

    setStatus("verifying");
    setErrorDetail(null);

    try {
      // 1. Obtener sesión del usuario
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      const token = sessionData?.session?.access_token;

      if (!userId || !token) {
        console.warn("[SuccessClient] No hay sesión activa. Esperando...");
        setErrorDetail("No se detectó una sesión de usuario. Intenta iniciar sesión nuevamente.");
        setStatus("error");
        return;
      }

      console.log("[SuccessClient] Verificando sesión:", sessionId);

      // 2. Verificar directamente con Stripe via API
      const stripeRes = await fetch(`/next_api/stripe/checkout?session_id=${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!stripeRes.ok) {
        const errJson = await stripeRes.json().catch(() => ({}));
        console.warn("[SuccessClient] Stripe verification failed:", errJson);

        // Fallback: consultar Supabase directamente
        await checkSupabaseSubscription(userId, token);
        return;
      }

      const stripeData = await stripeRes.json();
      console.log("[SuccessClient] Stripe data:", stripeData);

      if (!stripeData.success) {
        setErrorDetail(stripeData.error || "Error verificando con Stripe");
        setStatus("error");
        return;
      }

      const session = stripeData.session;

      // 3. Si pago confirmado por Stripe
      if (session?.payment_status === "paid" || session?.status === "complete") {
        const planId = session?.plan_id || session?.metadata?.plan_id || "profesional";

        // Obtener nombre del plan
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("nombre")
          .eq("id", planId)
          .maybeSingle();

        setPlanName(plan?.nombre || "Profesional");
        setSubscriptionStatus("active");
        setStatus("done");
        return;
      }

      // 4. Si Stripe no confirma pago aún
      if (session?.payment_status === "unpaid") {
        setErrorDetail("Stripe aún no ha confirmado el pago. Esto puede tardar unos minutos.");
        setStatus("error");
        return;
      }

      // Fallback final
      await checkSupabaseSubscription(userId, token);

    } catch (err: any) {
      console.error("[SuccessClient] Error:", err);
      setErrorDetail(err.message || "Error inesperado al verificar el pago.");
      setStatus("error");
    }
  }, [sessionId]);

  /**
   * Fallback: consultar Supabase directamente
   */
  const checkSupabaseSubscription = async (userId: string, token: string) => {
    try {
      // Consultar API user-subscription
      const subRes = await fetch("/api/user-subscription", {
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (subRes.ok) {
        const subJson = await subRes.json();
        const sub = subJson.data?.subscription;

        if (sub && ["active", "trialing", "past_due"].includes(sub.estado)) {
          const { data: plan } = await supabase
            .from("subscription_plans")
            .select("nombre")
            .eq("id", sub.plan_id)
            .maybeSingle();

          setPlanName(plan?.nombre || null);
          setSubscriptionStatus(sub.estado);
          setStatus("done");
          return;
        }
      }

      // Consulta directa a Supabase
      const { data: dbSub } = await supabase
        .from("subscriptions")
        .select("plan_id, estado")
        .eq("user_id", userId)
        .or("estado.eq.active,estado.eq.trialing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbSub) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("nombre")
          .eq("id", dbSub.plan_id)
          .maybeSingle();

        setPlanName(plan?.nombre || null);
        setSubscriptionStatus(dbSub.estado);
        setStatus("done");
        return;
      }

      setErrorDetail("No se encontró una suscripción activa. El pago puede estar en proceso.");
      setStatus("error");
    } catch (e) {
      console.error("[SuccessClient] Fallback error:", e);
      setErrorDetail("Error consultando la base de datos.");
      setStatus("error");
    }
  };

  // ── Efecto principal ──────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "loading" && sessionId) {
      verifyPayment();
    }
  }, [sessionId, status, verifyPayment]);

  // Si no hay sessionId después de 3 segundos, mostrar error
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!sessionId && status === "loading") {
        setErrorDetail("No se encontró el ID de sesión de pago en la URL. Stripe puede no haber redirigido correctamente.");
        setStatus("error");
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [sessionId, status]);

  // ── Redirección automática al dashboard tras confirmación ──────────────────
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
              {(status === "loading" || status === "verifying") && (
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
                      {status === "verifying" ? "Verificando tu pago con Stripe..." : "Cargando información del pago..."}
                    </p>
                    {sessionId && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Ref: {sessionId.slice(-12)}
                      </p>
                    )}
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
                      {errorDetail || "No pudimos confirmar tu suscripción automáticamente."}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                    💡 Tu pago fue procesado por Stripe. Si en unos minutos no
                    ves tu plan activo en el dashboard, contacta soporte.
                  </div>
                  {rawUrl && (
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      URL: {rawUrl}
                    </p>
                  )}
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => {
                        setStatus("loading");
                        setErrorDetail(null);
                        verifyPayment();
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

// Wrapper con Suspense para Next.js App Router
export default function SuccessClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto" />
            <p className="text-green-700 font-medium">Cargando...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}