"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Check, Crown, Zap, Shield, ArrowRight, Loader2,
  AlertTriangle, CreditCard, Sparkles, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════════
   SUSCRIPCION CLIENT V3 — Token JWT en header, fallback robusto
   ═══════════════════════════════════════════════════════════════ */

interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  precio_anual: number | null;
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
  popular: boolean;
  caracteristicas: string[];
  color: string;
  icono: string;
  orden: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  estado: string;
  current_period_end: string | null;
  created_at: string;
  plan?: Plan;
}

function isValidStripePriceId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (!trimmed.startsWith("price_")) return false;
  const invalid = ["XXX", "YYY", "ZZZ", "placeholder", "test", "demo", "example", "null", "undefined"];
  return !invalid.some((p) => trimmed.toLowerCase().includes(p.toLowerCase()));
}

export default function SuscripcionClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"month" | "year">("month");
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // 1. Obtener sesión y token JWT
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setUserId(session?.user?.id ?? null);
        setSessionToken(session?.access_token ?? null);
      }
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setSessionToken(session?.access_token ?? null);
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  // 2. Cargar planes y suscripción
  useEffect(() => {
    if (!userId || !sessionToken) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // A) Intentar API user-subscription con token JWT en header
        const apiRes = await fetch(`/api/user-subscription`, {
          headers: {
            "Authorization": `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        });

        let subData: Subscription | null = null;
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson.success && apiJson.data?.subscription) {
            subData = apiJson.data.subscription;
          }
        }

        // B) Fallback: consultar Supabase directo si la API falla
        if (!subData) {
          const { data: subRows } = await supabase
            .from("subscriptions")
            .select("*, plan:subscription_plans(*)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (subRows) {
            subData = subRows as unknown as Subscription;
          }
        }

        if (!cancelled) setSubscription(subData);

        // C) Cargar planes
        const { data: planRows, error: planError } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("estado", "activo")
          .order("orden", { ascending: true });

        if (planError) {
          console.error("[SuscripcionClient] Error planes:", planError);
        }

        if (!cancelled && planRows) {
          setPlans(planRows as Plan[]);
        }
      } catch (err) {
        console.error("[SuscripcionClient] Error cargando:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, sessionToken]);

  // 3. Checkout Stripe
  const handleCheckout = useCallback(async (plan: Plan) => {
    const priceId = billingCycle === "year"
      ? plan.stripe_price_id_anual
      : plan.stripe_price_id;

    if (!isValidStripePriceId(priceId)) {
      toast.error("Este plan no tiene configuración de pago activa.");
      return;
    }

    if (!sessionToken) {
      toast.error("Debes iniciar sesión para suscribirte.");
      return;
    }

    setLoadingCheckout(plan.id);
    try {
      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          plan_id: plan.id,
          billing: billingCycle,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Error al iniciar el checkout");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("No se recibió URL de checkout");
      }
    } catch (err) {
      toast.error("Error de red al contactar Stripe");
    } finally {
      setLoadingCheckout(null);
    }
  }, [billingCycle, sessionToken]);

  // 4. Plan actual del usuario
  const currentPlanId = subscription?.plan_id || subscription?.plan?.id;
  const isTrialing = subscription?.estado === "trialing";
  const isActive = subscription?.estado === "active";
  const hasSubscription = isTrialing || isActive;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Cargando planes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold">Suscripciones PlaneaDocente</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Desbloquea todo el potencial de tu planeación educativa con herramientas profesionales diseñadas para la <span className="text-primary font-medium">Nueva Escuela Mexicana</span>.
        </p>
      </div>

      {/* Toggle Mensual/Anual */}
      <div className="flex justify-center">
        <div className="bg-muted rounded-full p-1 flex gap-1">
          <button
            onClick={() => setBillingCycle("month")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              billingCycle === "month" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle("year")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              billingCycle === "year" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Anual <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">-20%</span>
          </button>
        </div>
      </div>

      {/* Estado de suscripción actual */}
      {hasSubscription && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">
              {isTrialing ? "Estás en periodo de prueba" : "Suscripción activa"} — Plan {subscription?.plan?.nombre || "Profesional"}
            </span>
          </div>
          {subscription?.current_period_end && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              {isTrialing ? "Prueba hasta:" : "Próxima renovación:"} {new Date(subscription.current_period_end).toLocaleDateString("es-MX")}
            </p>
          )}
        </motion.div>
      )}

      {/* Alerta Stripe no configurado */}
      {plans.some((p) => !isValidStripePriceId(p.stripe_price_id)) && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Pagos temporalmente deshabilitados</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Los price IDs de Stripe aún no están configurados. Los botones de pago están desactivados hasta que configures Stripe en producción.
            </p>
          </div>
        </div>
      )}

      {/* Grid de planes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const price = billingCycle === "year" && plan.precio_anual
            ? plan.precio_anual
            : plan.precio_mensual;
          const priceId = billingCycle === "year"
            ? plan.stripe_price_id_anual
            : plan.stripe_price_id;
          const canCheckout = isValidStripePriceId(priceId) && !isCurrent && hasSubscription === false;
          const isDisabled = !isValidStripePriceId(priceId) || isCurrent;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: plan.orden * 0.1 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-lg scale-105"
                  : "border-border bg-card shadow-sm"
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                  <Zap className="w-3 h-3 mr-1" /> Más Popular
                </Badge>
              )}

              <div className="mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  {plan.icono === "building" ? <Building2 className="w-6 h-6 text-primary" /> : <Crown className="w-6 h-6 text-primary" />}
                </div>
                <h3 className="text-xl font-bold">{plan.nombre}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.descripcion}</p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">${price}</span>
                <span className="text-muted-foreground">/mes</span>
                {!isValidStripePriceId(priceId) && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Precio pendiente de configuración</p>
                )}
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.caracteristicas?.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="outline" className="w-full gap-2" disabled>
                  <Check className="w-4 h-4" /> Plan Actual
                </Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={() => handleCheckout(plan)}
                  disabled={isDisabled || loadingCheckout === plan.id}
                >
                  {loadingCheckout === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  {loadingCheckout === plan.id ? "Procesando..." : "Elegir Plan"}
                </Button>
              )}

              {isDisabled && !isCurrent && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Configuración de pago pendiente
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Seguridad */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Pagos seguros por Stripe · Cancela cuando quieras</span>
      </div>
    </div>
  );
}
