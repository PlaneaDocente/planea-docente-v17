"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check, Loader2, Zap, Building2, GraduationCap, ArrowRight,
  AlertTriangle, RefreshCw, Shield, Clock, Sparkles, Crown,
  ChevronRight, LogIn, AlertCircle, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── TIPOS ───
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
  trial_end: string | null;
}

type LoadingState = "idle" | "loading" | "error" | "ready";

// ─── UTILIDADES ───
function formatPrice(cents: number | null, pesos: number | null): string {
  if (cents && cents > 0) {
    return `$${(cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  if (pesos && pesos > 0) {
    return `$${pesos.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  return "Gratis";
}

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: "basico", nombre: "Básico",
    descripcion: "Ideal para maestros que inician. Hasta 35 alumnos, registro de asistencia, planeaciones básicas y reportes simples.",
    precio_mensual: 99, precio_anual: 950, precio_centavos: 9900, precio_centavos_anual: 95000,
    caracteristicas: ["Hasta 35 alumnos", "Registro de asistencia", "Planeaciones básicas", "Reportes simples", "15 días de prueba"],
    activo: true, orden: 1, stripe_price_id: null, stripe_price_id_anual: null, dias_prueba: 15,
  },
  {
    id: "profesional", nombre: "Profesional",
    descripcion: "Para maestros avanzados. Alumnos ilimitados, herramientas IA, generación de imágenes, planeaciones IA y reportes avanzados.",
    precio_mensual: 199, precio_anual: 1910, precio_centavos: 19900, precio_centavos_anual: 191000,
    caracteristicas: ["Alumnos ilimitados", "Herramientas IA", "Generación de imágenes IA", "Planeaciones con IA", "Comunicación con padres", "Reportes avanzados", "15 días de prueba"],
    activo: true, orden: 2, stripe_price_id: null, stripe_price_id_anual: null, dias_prueba: 15,
  },
  {
    id: "institucional", nombre: "Institucional",
    descripcion: "Para escuelas e instituciones. Múltiples maestros, panel de director, reportes institucionales y soporte 24/7.",
    precio_mensual: 499, precio_anual: 4790, precio_centavos: 49900, precio_centavos_anual: 479000,
    caracteristicas: ["Múltiples maestros", "Panel de director", "Gestión de grupos", "Reportes institucionales", "Integración con SEP", "Soporte 24/7", "15 días de prueba"],
    activo: true, orden: 3, stripe_price_id: null, stripe_price_id_anual: null, dias_prueba: 15,
  },
];

// ─── COMPONENTE ───
export default function SuscripcionClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const canceled = searchParams.get("canceled") === "true";

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadState, setLoadState] = useState<LoadingState>("idle");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ─── CARGAR DATOS ───
  const loadData = useCallback(async () => {
    setLoadState("loading");
    setErrorMsg(null);

    try {
      // 1. Obtener sesión + token JWT
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id ?? null;
      const token = sessionData?.session?.access_token ?? null;
      setUserId(uid);
      setSessionToken(token);

      // 2. Cargar planes (API + Supabase fallback)
      let normalizedPlans: SubscriptionPlan[] = [];
      let apiSuccess = false;

      try {
        const res = await fetch("/api/subscription-plans", { cache: "no-store" });
        if (res.ok) {
          const plansJson = await res.json();
          const rawPlans = plansJson.data ?? plansJson.plans ?? [];
          normalizedPlans = rawPlans.map((p: any) => ({
            ...p,
            precio_centavos: p.precio_centavos ?? (p.precio_mensual ? p.precio_mensual * 100 : 0),
            precio_centavos_anual: p.precio_centavos_anual ?? (p.precio_anual ? p.precio_anual * 100 : null),
            stripe_price_id_anual: p.stripe_price_id_anual ?? null,
            caracteristicas: Array.isArray(p.caracteristicas) ? p.caracteristicas : [],
            dias_prueba: p.dias_prueba ?? 15,
          }));
          apiSuccess = true;
        }
      } catch (apiErr) {
        console.warn("[Suscripcion] API falló, usando Supabase directo...");
      }

      if (!apiSuccess || normalizedPlans.length === 0) {
        const { data: dbPlans, error: dbError } = await supabase
          .from("subscription_plans")
          .select("*")
          .order("orden", { ascending: true });
        if (dbError) throw dbError;
        normalizedPlans = (dbPlans || []).map((p: any) => ({
          ...p,
          precio_centavos: p.precio_centavos ?? (p.precio_mensual ? p.precio_mensual * 100 : 0),
          precio_centavos_anual: p.precio_centavos_anual ?? (p.precio_anual ? p.precio_anual * 100 : null),
          caracteristicas: Array.isArray(p.caracteristicas) ? p.caracteristicas : [],
          dias_prueba: p.dias_prueba ?? 15,
        }));
      }

      if (normalizedPlans.length === 0) {
        normalizedPlans = FALLBACK_PLANS;
        toast.warning("Mostrando planes de respaldo.");
      }

      const hasStripeIds = normalizedPlans.some((p) => {
        const pid = billing === "annual" ? p.stripe_price_id_anual : p.stripe_price_id;
        return pid && pid.startsWith("price_");
      });
      setStripeConfigured(hasStripeIds);
      setPlans(normalizedPlans);

      // 3. Cargar suscripción actual
      if (uid) {
        let subData: any = null;
        try {
          const subRes = await fetch(`/api/user-subscription?user_id=${uid}`, { cache: "no-store" });
          if (subRes.ok) {
            const subJson = await subRes.json();
            subData = subJson.data?.subscription ?? subJson.subscription ?? null;
          }
        } catch (e) {
          console.warn("[Suscripcion] API subscription falló, fallback Supabase...");
        }

        if (!subData) {
          const { data: dbSub } = await supabase
            .from("subscriptions")
            .select("plan_id, estado, trial_end")
            .eq("user_id", uid)
            .in("estado", ["trialing", "active", "past_due"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          subData = dbSub;
        }

        if (subData) {
          setCurrentSubscription({
            plan_id: subData.plan_id ?? subData.planId ?? "",
            estado: subData.estado ?? "active",
            trial_end: subData.trial_end ?? null,
          });
        }
      }

      setLoadState("ready");
    } catch (err: any) {
      console.error("[SuscripcionPage] Load error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setPlans(FALLBACK_PLANS);
      setLoadState("ready");
    }
  }, [billing]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (canceled) {
      toast.info("El pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.", { duration: 5000 });
    }
  }, [canceled]);

  // ─── CHECKOUT CON TOKEN JWT ───
  const handleSubscribe = useCallback(async (plan: SubscriptionPlan) => {
    setCheckoutLoading(true);
    setActivePlanId(plan.id);
    setErrorMsg(null);

    try {
      // Verificar sesión actual
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      const token = sessionData?.session?.access_token;

      if (!uid) {
        toast.error("Debes iniciar sesión para suscribirte");
        router.push("/login?redirect=/suscripcion");
        return;
      }

      const priceId = billing === "annual"
        ? (plan.stripe_price_id_anual || plan.stripe_price_id)
        : plan.stripe_price_id;

      if (!priceId || !priceId.startsWith("price_")) {
        toast.error(`⚠️ El plan "${plan.nombre}" no tiene precio de Stripe configurado.`, { duration: 6000 });
        setCheckoutLoading(false);
        setActivePlanId(null);
        return;
      }

      // ─── ENVIAR TOKEN JWT EN HEADER ───
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({
          price_id: priceId,
          billing: billing === "annual" ? "year" : "month",
          plan_id: plan.id,
          user_id: uid, // Backup por si el token falla
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        const code = json.code || "UNKNOWN";
        const detail = json.detail || json.error || "Error al procesar el pago";

        if (code === "UNAUTHENTICATED" || res.status === 401) {
          toast.error("❌ Sesión expirada. Vuelve a iniciar sesión.", { duration: 8000 });
          router.push("/login?redirect=/suscripcion");
        } else if (code === "STRIPE_RESOURCE_MISSING" || code === "INVALID_PRICE_ID") {
          toast.error(`❌ ${detail}`, { duration: 8000 });
        } else {
          toast.error(detail);
        }
        setCheckoutLoading(false);
        setActivePlanId(null);
        return;
      }

      if (json.url || json.data?.url) {
        toast.success("Redirigiendo a Stripe para pago seguro... 🔒");
        window.location.href = json.url || json.data?.url;
      } else {
        throw new Error("No se recibió URL de checkout");
      }
    } catch (err: any) {
      console.error("[SuscripcionPage] Checkout error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Error al iniciar el pago");
      toast.error(err instanceof Error ? err.message : "Error de conexión. Intenta de nuevo.");
      setCheckoutLoading(false);
      setActivePlanId(null);
    }
  }, [billing, router]);

  // ─── RENDER ───
  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Cargando planes de suscripción...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="secondary" className="mb-2 text-sm">
              <Crown className="w-3 h-3 mr-1" /> Elige tu plan ideal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              Suscripciones PlaneaDocente
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-2">
              Desbloquea todo el potencial de tu planeación educativa con herramientas profesionales
              diseñadas para la <span className="font-semibold text-indigo-600">Nueva Escuela Mexicana</span>.
            </p>
          </motion.div>
        </div>

        {/* Alerta Stripe */}
        {!stripeConfigured && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <Card className="border-amber-300 bg-amber-50/80">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 text-sm">⚠️ Pagos temporalmente deshabilitados</h3>
                    <p className="text-xs text-amber-700 mt-1">
                      Los planes muestran precios correctamente, pero aún no están conectados con Stripe.
                    </p>
                    <div className="mt-3 bg-white/60 rounded-lg p-3 text-xs text-amber-800 space-y-1">
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

        {/* Banner login */}
        {!userId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="py-4 flex items-center gap-3 justify-center flex-wrap">
                <LogIn className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Inicia sesión</span> para suscribirte y comenzar tu prueba gratuita.
                </p>
                <Button size="sm" variant="outline" onClick={() => router.push("/login?redirect=/suscripcion")}>Entrar</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Banner suscripción activa */}
        {currentSubscription && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto">
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="py-4 flex items-center gap-3 justify-center flex-wrap">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800">
                  Ya tienes una suscripción{" "}
                  <span className="font-semibold capitalize">{currentSubscription.estado.replace("_", " ")}</span>
                  . Puedes cambiar de plan o gestionarla desde tu dashboard.
                </p>
                <Button size="sm" onClick={() => router.push("/dashboard")}>Dashboard</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error */}
        {errorMsg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="py-4 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-sm text-red-700 font-medium">{errorMsg}</p>
                <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
                  <RefreshCw className="w-4 h-4" /> Reintentar
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Toggle Mensual/Anual */}
        <div className="flex justify-center">
          <div className="bg-white rounded-full p-1.5 shadow-lg border flex items-center gap-2">
            <button onClick={() => setBilling("monthly")} className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${billing === "monthly" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"}`}>Mensual</button>
            <button onClick={() => setBilling("annual")} className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${billing === "annual" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"}`}>Anual <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">-20%</Badge></button>
          </div>
        </div>

        {/* Grid de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, index) => {
            const isPopular = plan.nombre.toLowerCase().includes("profesional");
            const isInstitutional = plan.nombre.toLowerCase().includes("institucional");
            const isCurrent = currentSubscription?.plan_id === plan.id;
            const monthlyPrice = plan.precio_centavos ?? plan.precio_mensual ?? 0;
            const annualPrice = plan.precio_centavos_anual ?? plan.precio_anual ?? 0;
            const displayPrice = billing === "annual" ? annualPrice : monthlyPrice;
            const hasRealPrice = displayPrice > 0;
            const priceId = billing === "annual" ? plan.stripe_price_id_anual : plan.stripe_price_id;
            const hasStripePrice = !!priceId && priceId.startsWith("price_");
            const canSubscribe = hasStripePrice && !!userId && !isCurrent;
            const isFreePlan = !hasRealPrice && !hasStripePrice;
            const isProcessing = checkoutLoading && activePlanId === plan.id;

            return (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.15, duration: 0.5 }}>
                <Card className={`relative h-full flex flex-col transition-all duration-300 hover:shadow-xl ${isPopular ? "border-indigo-400 shadow-lg shadow-indigo-100 scale-[1.02] md:scale-105" : "border-slate-200"} ${isCurrent ? "ring-2 ring-green-500" : ""}`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-0 px-3 py-1 shadow-md"><Sparkles className="w-3 h-3 mr-1" /> Más Popular</Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-500 text-white border-0 px-3 py-1 shadow-md"><Check className="w-3 h-3 mr-1" /> Plan Actual</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2 pt-6 text-center">
                    <div className="flex justify-center mb-3">
                      {isInstitutional ? <Building2 className="w-10 h-10 text-purple-500" /> : isPopular ? <Zap className="w-10 h-10 text-amber-500" /> : <GraduationCap className="w-10 h-10 text-blue-500" />}
                    </div>
                    <h3 className="text-2xl font-bold">{plan.nombre}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.descripcion || "Plan de suscripción"}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-6">
                    <div className="text-center space-y-1">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-extrabold tracking-tight">
                          {formatPrice(billing === "annual" ? plan.precio_centavos_anual : plan.precio_centavos, billing === "annual" ? plan.precio_anual : plan.precio_mensual)}
                        </span>
                        {hasRealPrice && <span className="text-muted-foreground">MXN/{billing === "annual" ? "año" : "mes"}</span>}
                      </div>
                      {billing === "annual" && monthlyPrice > 0 && annualPrice > 0 && (
                        <p className="text-xs text-green-600 font-medium">Ahorras {formatPrice(monthlyPrice * 12 - annualPrice, null)} al año</p>
                      )}
                      {!hasRealPrice && !isFreePlan && (
                        <p className="text-xs text-amber-600 flex items-center justify-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> Precio pendiente de configuración</p>
                      )}
                      {plan.dias_prueba && plan.dias_prueba > 0 && hasRealPrice && (
                        <p className="text-xs text-green-600 font-medium mt-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />{plan.dias_prueba} días de prueba gratis</p>
                      )}
                    </div>
                    <ul className="space-y-3 flex-1">
                      {(plan.caracteristicas || []).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /><span className="text-slate-700">{feature}</span></li>
                      ))}
                      {(!plan.caracteristicas || plan.caracteristicas.length === 0) && (
                        <li className="text-sm text-muted-foreground italic">Características no configuradas</li>
                      )}
                    </ul>
                    <div className="space-y-2">
                      {isCurrent ? (
                        <Button disabled className="w-full gap-2 bg-green-600 hover:bg-green-600 cursor-default"><Check className="w-4 h-4" /> Plan Actual</Button>
                      ) : (
                        <>
                          <Button onClick={() => handleSubscribe(plan)} disabled={isProcessing || !canSubscribe} className={`w-full gap-2 ${isPopular ? "bg-indigo-600 hover:bg-indigo-700" : ""} ${!canSubscribe ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200" : ""}`}>
                            {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirigiendo...</>
                            : !userId ? "Inicia sesión para suscribirte"
                            : isFreePlan ? "Activar gratis"
                            : !hasStripePrice ? <><AlertCircle className="w-4 h-4" /> Configuración pendiente</>
                            : <><>Elegir Plan</><ArrowRight className="w-4 h-4" /></>}
                          </Button>
                          {billing === "annual" && hasStripePrice && plan.stripe_price_id_anual && (
                            <p className="text-[10px] text-center text-slate-400">Pago anual con descuento aplicado</p>
                          )}
                        </>
                      )}
                      {!hasStripePrice && userId && !isFreePlan && !isCurrent && (
                        <p className="text-xs text-center text-amber-600 flex items-center justify-center gap-1"><Info className="w-3 h-3" /> Plan pendiente de configuración de pago.</p>
                      )}
                      {canSubscribe && (
                        <p className="text-[10px] text-center text-slate-400 flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> Pago seguro por Stripe · Cancela cuando quieras</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pt-8 border-t border-slate-200">
          <p className="text-sm text-muted-foreground">Pagos procesados de forma segura por <span className="font-semibold">Stripe</span>.</p>
          <p className="text-xs text-muted-foreground">¿Tienes dudas? <a href="mailto:soporte@planeadocente.com" className="underline hover:text-indigo-600 transition-colors">soporte@planeadocente.com</a></p>
        </div>
      </div>
    </div>
  );
}