"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Loader2, Sparkles, Zap, Building2, ArrowRight, Crown,
  AlertTriangle, LogIn, RefreshCw, AlertCircle, Shield, Info,
  ChevronRight, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_mensual: number | null;
  precio_anual: number | null;
  precio_centavos: number | null;
  precio_centavos_anual: number | null;
  caracteristicas: string[];
  activo: boolean;
  orden: number;
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
  dias_prueba: number | null;
}

interface CurrentSubscription {
  plan_id: string;
  estado: string;
}

type LoadingState = "idle" | "loading" | "error" | "ready";
type CheckoutState = "idle" | "redirecting" | "error";

function formatPrice(cents: number | null, pesos: number | null): string {
  if (cents && cents > 0) {
    return `$${(cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  if (pesos && pesos > 0) {
    return `$${pesos.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  return "Gratis";
}

export default function SuscripcionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadState, setLoadState] = useState<LoadingState>("idle");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("idle");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  const loadData = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      setUserId(uid);

      const res = await fetch("/api/subscription-plans");
      const plansJson = await res.json();

      if (!res.ok || !plansJson.success) {
        throw new Error(plansJson.error || "Error al cargar planes");
      }

      const normalizedPlans: SubscriptionPlan[] = (plansJson.data ?? []).map((p: any) => ({
        ...p,
        precio_centavos: p.precio_centavos ?? (p.precio_mensual ? p.precio_mensual * 100 : 0),
        precio_centavos_anual: p.precio_centavos_anual ?? (p.precio_anual ? p.precio_anual * 100 : null),
        stripe_price_id_anual: p.stripe_price_id_anual ?? null,
        caracteristicas: p.caracteristicas ?? [],
        dias_prueba: p.dias_prueba ?? 15,
      }));

      // Verificar si Stripe está configurado (algún plan tiene price_id válido)
      const hasStripeIds = normalizedPlans.some(
        (p) => p.stripe_price_id && p.stripe_price_id.startsWith("price_")
      );
      setStripeConfigured(hasStripeIds);

      setPlans(normalizedPlans);

      if (uid) {
        const subRes = await fetch(`/api/user-subscription?user_id=${uid}`);
        const subJson = await subRes.json();
        if (subRes.ok && subJson.success && subJson.data?.subscription) {
          setCurrentSubscription({
            plan_id: subJson.data.subscription.plan_id ?? subJson.data.subscription.planId,
            estado: subJson.data.subscription.estado,
          });
        }
      }

      setLoadState("ready");
    } catch (err) {
      console.error("[SuscripcionPage] Load error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadData();
    if (canceled) {
      toast.info("El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.", { duration: 5000 });
    }
  }, [loadData, canceled]);

  const handleSubscribe = useCallback(async (plan: SubscriptionPlan, billing: "monthly" | "annual" = "monthly") => {
    setCheckoutState("redirecting");
    setActivePlanId(plan.id);
    setErrorMsg(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;

      if (!uid) {
        toast.error("Debes iniciar sesión para suscribirte");
        router.push("/login?redirect=/suscripcion");
        return;
      }

      const priceId = billing === "annual"
        ? (plan.stripe_price_id_anual || plan.stripe_price_id)
        : plan.stripe_price_id;

      // ─── VALIDACIÓN FRONTEND: ¿Stripe configurado? ───
      if (!priceId || !priceId.startsWith("price_")) {
        setCheckoutState("error");
        setActivePlanId(null);
        toast.error(
          `⚠️ El plan "${plan.nombre}" no tiene un precio de Stripe configurado. Contacta al administrador.`,
          { duration: 6000 }
        );
        return;
      }

      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId,
          user_id: uid,
          billing: billing === "annual" ? "year" : "month",
          plan_id: plan.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setCheckoutState("error");
        setActivePlanId(null);

        if (json.code === "STRIPE_RESOURCE_MISSING") {
          toast.error(`❌ ${json.error}. ${json.detail || ""}`, { duration: 8000 });
        } else if (json.code === "INVALID_PRICE_ID") {
          toast.error(`❌ ${json.error}. ${json.detail || ""}`, { duration: 8000 });
        } else {
          toast.error(json.error || "Error al iniciar el pago");
        }
        return;
      }

      if (json.url) {
        toast.success("Redirigiendo a Stripe para pago seguro... 🔒");
        window.location.href = json.url;
      } else {
        throw new Error("No se recibió URL de checkout");
      }
    } catch (err) {
      console.error("[SuscripcionPage] Checkout error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error al iniciar el pago");
      setCheckoutState("error");
      setActivePlanId(null);
      toast.error(err instanceof Error ? err.message : "Error al iniciar el pago");
    }
  }, [router]);

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
            <Button onClick={loadData} variant="outline" className="w-full gap-2">
              <RefreshCw className="w-4 h-4" /> Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

        {/* ALERTA: STRIPE NO CONFIGURADO */}
        {!stripeConfigured && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
                      ⚠️ Pagos temporalmente deshabilitados
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Los planes muestran precios correctamente, pero aún no están conectados con Stripe.
                      Los botones de pago están deshabilitados hasta que el administrador configure los price_id.
                    </p>
                    <div className="mt-3 bg-white/60 dark:bg-black/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-medium">Para activar pagos:</p>
                      <ol className="list-decimal list-inside space-y-0.5 ml-1">
                        <li>Ve a <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Stripe Dashboard → Products</a></li>
                        <li>Crea 3 productos (Básico $99, Profesional $199, Institucional $499)</li>
                        <li>Copia los <code>price_...</code> IDs a la tabla <code>subscription_plans</code> en Supabase</li>
                        <li>Verifica que <code>STRIPE_SECRET_KEY</code> esté en Vercel</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Banner login requerido */}
        {!userId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
              <CardContent className="py-4 flex items-center gap-3 justify-center flex-wrap">
                <LogIn className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <span className="font-semibold">Inicia sesión</span> para suscribirte y comenzar tu prueba gratuita.
                </p>
                <Button size="sm" variant="outline" onClick={() => router.push("/login?redirect=/suscripcion")}>
                  Entrar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Banner si ya tiene suscripción */}
        {currentSubscription && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto"
          >
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30">
              <CardContent className="py-4 flex items-center gap-3 justify-center flex-wrap">
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

            const monthlyPrice = plan.precio_centavos ?? plan.precio_mensual ?? 0;
            const annualPrice = plan.precio_centavos_anual ?? plan.precio_anual ?? 0;
            const hasRealPrice = monthlyPrice > 0;
            const hasStripePrice = !!plan.stripe_price_id && plan.stripe_price_id.startsWith("price_");
            const canSubscribe = hasStripePrice && !!userId;
            const isFreePlan = !hasRealPrice && !hasStripePrice;
            const isProcessing = checkoutState === "redirecting" && activePlanId === plan.id;

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
                          {formatPrice(plan.precio_centavos, plan.precio_mensual)}
                        </span>
                        {hasRealPrice && (
                          <span className="text-muted-foreground">MXN/mes</span>
                        )}
                      </div>
                      {annualPrice > 0 && (
                        <p className="text-xs text-muted-foreground">
                          o {formatPrice(plan.precio_centavos_anual, plan.precio_anual)} MXN/año
                        </p>
                      )}
                      {!hasRealPrice && !isFreePlan && (
                        <p className="text-xs text-amber-600 flex items-center justify-center gap-1 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          Precio pendiente de configuración
                        </p>
                      )}
                      {plan.dias_prueba && plan.dias_prueba > 0 && hasRealPrice && (
                        <p className="text-xs text-green-600 font-medium mt-1 flex items-center justify-center gap-1">
                          <Clock className="w-3 h-3" />
                          {plan.dias_prueba} días de prueba gratis
                        </p>
                      )}
                    </div>

                    {/* Características */}
                    <ul className="space-y-3 flex-1">
                      {plan.caracteristicas.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                        </li>
                      ))}
                      {plan.caracteristicas.length === 0 && (
                        <li className="text-sm text-muted-foreground italic">
                          Características no configuradas
                        </li>
                      )}
                    </ul>

                    {/* Botones de acción */}
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
                            disabled={isProcessing || !canSubscribe}
                            className={`w-full gap-2 ${
                              isPopular ? "bg-primary hover:bg-primary/90" : ""
                            } ${!canSubscribe ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200" : ""}`}
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Redirigiendo...
                              </>
                            ) : !userId ? (
                              "Inicia sesión para suscribirte"
                            ) : isFreePlan ? (
                              "Activar gratis"
                            ) : !hasStripePrice ? (
                              <>
                                <AlertCircle className="w-4 h-4" />
                                Configuración pendiente
                              </>
                            ) : (
                              <>
                                Elegir Plan
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </Button>

                          {annualPrice > 0 && hasStripePrice && (
                            <Button
                              onClick={() => handleSubscribe(plan, "annual")}
                              disabled={isProcessing || !canSubscribe}
                              variant="outline"
                              className="w-full gap-2 text-xs"
                            >
                              Pagar anual (ahorro incluido)
                            </Button>
                          )}
                        </>
                      )}

                      {/* Mensajes informativos debajo del botón */}
                      {!hasStripePrice && userId && !isFreePlan && (
                        <p className="text-xs text-center text-amber-600 flex items-center justify-center gap-1">
                          <Info className="w-3 h-3" />
                          Plan pendiente de configuración de pago.
                        </p>
                      )}

                      {canSubscribe && (
                        <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1">
                          <Shield className="w-3 h-3" />
                          Pago seguro por Stripe · Cancela cuando quieras
                        </p>
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