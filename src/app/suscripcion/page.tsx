"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  Sparkles,
  Zap,
  Building2,
  ArrowRight,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_mensual: number;
  precio_anual: number | null;
  caracteristicas: string[];
  activo: boolean;
  orden: number;
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
}

type LoadingState = "idle" | "loading" | "error" | "ready";
type CheckoutState = "idle" | "redirecting" | "error";

export default function SuscripcionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadState, setLoadState] = useState<LoadingState>("idle");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{
    plan_id: string;
    estado: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Cargar planes y suscripción actual ─────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoadState("loading");
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        // 1. Cargar planes activos
        const res = await fetch("/api/subscription-plans");
        const plansJson = await res.json();

        if (!res.ok || !plansJson.success) {
          throw new Error(plansJson.error || "Error al cargar planes");
        }

        setPlans(plansJson.data ?? []);

        // 2. Si hay usuario logueado, verificar suscripción actual
        if (userId) {
          const subRes = await fetch(`/api/user-subscription?user_id=${userId}`);
          const subJson = await subRes.json();
          if (subRes.ok && subJson.success && subJson.data?.subscription) {
            setCurrentSubscription(subJson.data.subscription);
          }
        }

        setLoadState("ready");
      } catch (err) {
        console.error("[SuscripcionPage] Load error:", err);
        setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
        setLoadState("error");
      }
    };

    loadData();
  }, []);

  // ── Iniciar checkout de Stripe ─────────────────────────────────────────────
  const handleSubscribe = async (plan: SubscriptionPlan, billing: "monthly" | "annual" = "monthly") => {
    setCheckoutState("redirecting");
    setActivePlanId(plan.id);
    setErrorMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        router.push("/login?redirect=/suscripcion");
        return;
      }

      const priceId = billing === "annual" ? plan.stripe_price_id_anual : plan.stripe_price_id;

      if (!priceId) {
        throw new Error("Este plan no tiene configurado un precio de Stripe. Contacta soporte.");
      }

      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId,
          user_id: userId,
          billing,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.url) {
        throw new Error(json.error || "Error al iniciar el pago");
      }

      // Redirigir a Stripe Checkout
      window.location.href = json.url;
    } catch (err) {
      console.error("[SuscripcionPage] Checkout error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error al iniciar el pago");
      setCheckoutState("error");
      setActivePlanId(null);
    }
  };

  // ── Renderizado de estados ─────────────────────────────────────────────────
  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Cargando planes de suscripción...</p>
        </div>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-800">
          <CardContent className="pt-6 pb-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-700 dark:text-red-300">Error al cargar planes</h2>
            <p className="text-muted-foreground text-sm">{errorMsg}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render principal ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-2 text-sm">
              <Crown className="w-3 h-3 mr-1" />
              Elige tu plan ideal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Suscripciones PlaneaDocente
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
              Desbloquea todo el potencial de tu planeación educativa con herramientas profesionales
              diseñadas para la Nueva Escuela Mexicana.
            </p>
          </motion.div>
        </div>

        {/* Banner si ya tiene suscripción */}
        {currentSubscription && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
              <CardContent className="py-4 flex items-center gap-3 justify-center">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800 dark:text-green-300">
                  Ya tienes una suscripción{" "}
                  <span className="font-semibold capitalize">
                    {currentSubscription.estado.replace("_", " ")}
                  </span>
                  . Puedes cambiar de plan o gestionarla desde tu dashboard.
                </p>
                <Button size="sm" onClick={() => router.push("/dashboard")}>
                  Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error de checkout */}
        {errorMsg && checkoutState === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
              <CardContent className="py-4 text-center">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errorMsg}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Grid de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => {
            const isPopular = plan.nombre.toLowerCase().includes("profesional");
            const isInstitutional = plan.nombre.toLowerCase().includes("institucional");
            const isCurrent = currentSubscription?.plan_id === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15, duration: 0.5 }}
              >
                <Card
                  className={`relative h-full flex flex-col transition-all duration-300 hover:shadow-xl ${
                    isPopular
                      ? "border-primary shadow-lg scale-[1.02] md:scale-105"
                      : "border-slate-200 dark:border-slate-800"
                  } ${isCurrent ? "ring-2 ring-green-500 dark:ring-green-400" : ""}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-bold shadow-md">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Más Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-2 pt-6 text-center">
                    <div className="flex justify-center mb-3">
                      {isInstitutional ? (
                        <Building2 className="w-10 h-10 text-purple-500" />
                      ) : isPopular ? (
                        <Zap className="w-10 h-10 text-amber-500" />
                      ) : (
                        <Check className="w-10 h-10 text-slate-500" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold">{plan.nombre}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.descripcion || "Plan de suscripción"}
                    </p>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col space-y-6">
                    {/* Precio */}
                    <div className="text-center space-y-1">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-extrabold tracking-tight">
                          ${plan.precio_mensual}
                        </span>
                        <span className="text-muted-foreground">MXN/mes</span>
                      </div>
                      {plan.precio_anual && (
                        <p className="text-xs text-muted-foreground">
                          o ${plan.precio_anual} MXN/año
                        </p>
                      )}
                    </div>

                    {/* Características */}
                    <ul className="space-y-3 flex-1">
                      {(plan.caracteristicas ?? []).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                        </li>
                      ))}
                      {(!plan.caracteristicas || plan.caracteristicas.length === 0) && (
                        <li className="text-sm text-muted-foreground italic">
                          Características no configuradas
                        </li>
                      )}
                    </ul>

                    {/* Botón */}
                    <div className="space-y-2">
                      {isCurrent ? (
                        <Button
                          disabled
                          className="w-full gap-2 bg-green-600 hover:bg-green-600 cursor-default"
                        >
                          <Check className="w-4 h-4" />
                          Plan Actual
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleSubscribe(plan, "monthly")}
                            disabled={checkoutState === "redirecting" && activePlanId === plan.id}
                            className={`w-full gap-2 ${
                              isPopular
                                ? "bg-primary hover:bg-primary/90"
                                : ""
                            }`}
                          >
                            {checkoutState === "redirecting" && activePlanId === plan.id ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Redirigiendo...
                              </>
                            ) : (
                              <>
                                Elegir Plan
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </Button>
                          {plan.precio_anual && plan.stripe_price_id_anual && (
                            <Button
                              onClick={() => handleSubscribe(plan, "annual")}
                              disabled={checkoutState === "redirecting" && activePlanId === plan.id}
                              variant="outline"
                              className="w-full gap-2 text-xs"
                            >
                              Pagar anual (ahorro incluido)
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer de confianza */}
        <div className="text-center space-y-2 pt-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">
            Pagos procesados de forma segura por{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">Stripe</span>.
            Puedes cancelar tu suscripción en cualquier momento desde tu dashboard.
          </p>
          <p className="text-xs text-muted-foreground">
            ¿Tienes dudas? Escríbenos a{" "}
            <a
              href="mailto:soporte@planeadocente.com"
              className="underline hover:text-primary transition-colors"
            >
              soporte@planeadocente.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
