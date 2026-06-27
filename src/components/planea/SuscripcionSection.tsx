"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Check, Star, Zap, Shield, Clock,
  Crown, AlertCircle, Loader2, CheckCircle2,
  Gift, ExternalLink, TrendingUp, RefreshCw,
  BadgeCheck, Info, LogIn, X, Receipt, Settings,
  ArrowRight, ChevronRight, Ban, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ═══════════════════════════════════════════════════════════════════════════
   INTERFAZ UNIFICADA DE PLAN — Compatible con /api/subscription-plans
   ═══════════════════════════════════════════════════════════════════════════ */
interface DbPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_centavos: number;
  precio_centavos_anual?: number | null;
  moneda: string;
  intervalo: "month" | "year";
  dias_prueba: number;
  stripe_price_id: string | null;
  stripe_price_id_anual?: string | null;
  caracteristicas: string[];
  activo: boolean;
  orden: number;
}

interface ActiveSubscription {
  subscription: {
    id: string;
    estado: string;
    fecha_prueba_fin: string | null;
    fecha_fin: string | null;
    cancelar_al_periodo_fin: boolean;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  };
  plan: DbPlan | null;
}

interface PaymentRecord {
  id: string;
  fecha?: string;
  created_at?: string;
  monto_centavos: number;
  moneda: string;
  estado: "succeeded" | "pending" | "failed" | "refunded";
  descripcion: string;
  metodo: string;
}

/* ── Planes fallback (solo UI de emergencia) ──────────────────────────── */
const FALLBACK_PLANS: DbPlan[] = [
  {
    id: "basico",
    nombre: "Básico",
    precio_centavos: 9900,
    precio_centavos_anual: 99000,
    moneda: "mxn",
    intervalo: "month",
    dias_prueba: 15,
    stripe_price_id: null,
    stripe_price_id_anual: null,
    descripcion: "Ideal para maestros que inician",
    activo: true,
    orden: 1,
    caracteristicas: ["Hasta 35 alumnos", "Registro de asistencia", "Planeaciones básicas", "Reportes simples"],
  },
  {
    id: "profesional",
    nombre: "Profesional",
    precio_centavos: 19900,
    precio_centavos_anual: 199000,
    moneda: "mxn",
    intervalo: "month",
    dias_prueba: 15,
    stripe_price_id: null,
    stripe_price_id_anual: null,
    descripcion: "Para maestros avanzados",
    activo: true,
    orden: 2,
    caracteristicas: ["Alumnos ilimitados", "Herramientas IA", "Generación de imágenes", "Planeaciones IA", "Reportes avanzados"],
  },
  {
    id: "institucional",
    nombre: "Institucional",
    precio_centavos: 49900,
    precio_centavos_anual: 499000,
    moneda: "mxn",
    intervalo: "month",
    dias_prueba: 15,
    stripe_price_id: null,
    stripe_price_id_anual: null,
    descripcion: "Para escuelas",
    activo: true,
    orden: 3,
    caracteristicas: ["Múltiples maestros", "Panel de director", "Reportes institucionales", "Soporte 24/7"],
  },
];

const PLAN_META: Record<string, { gradient: string; icon: React.ElementType; badge?: string; popular?: boolean }> = {
  Básico: { gradient: "from-blue-500 to-blue-700", icon: Zap },
  Profesional: { gradient: "from-violet-600 to-purple-700", icon: Star, badge: "⭐ Más Popular", popular: true },
  Institucional: { gradient: "from-amber-500 to-orange-600", icon: Crown, badge: "🏫 Para Escuelas" },
};

function getPlanMeta(nombre: string) {
  return PLAN_META[nombre] ?? { gradient: "from-gray-500 to-gray-700", icon: Zap };
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════════════════════════════════════ */
export default function SuscripcionSection() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showStripeConfig, setShowStripeConfig] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<DbPlan | null>(null);
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const checkStripeConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Health check failed");
      const json = await res.json();
      setStripeConfigured(json.stripe_secret_key === "configured");
    } catch {
      setStripeConfigured(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setPlansLoading(true);
    setLoadError(null);
    try {
      const [plansRes, sessionData] = await Promise.all([
        fetch("/api/subscription-plans").catch(() => null),
        supabase.auth.getSession(),
      ]);

      let loadedPlans = FALLBACK_PLANS;
      if (plansRes && plansRes.ok) {
        const plansJson = await plansRes.json();
        if (plansJson.success && Array.isArray(plansJson.data) && plansJson.data.length > 0) {
          loadedPlans = plansJson.data.map((p: any) => ({
            ...p,
            precio_centavos_anual: p.precio_centavos_anual ?? p.precio_anual ? p.precio_anual * 100 : Math.round(p.precio_centavos * 10),
            stripe_price_id_anual: p.stripe_price_id_anual ?? null,
          }));
        }
      }
      setPlans(loadedPlans);

      const uid = sessionData.data?.session?.user?.id ?? null;
      const token = sessionData.data?.session?.access_token ?? null;
      setUserId(uid);

      if (uid && token) {
        try {
          // ✅ CORRECCIÓN: Añadir token Bearer al fetch de suscripción
          const subRes = await fetch(`/api/user-subscription?user_id=${uid}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).catch(() => null);
          if (subRes && subRes.ok) {
            const subJson = await subRes.json();
            if (subJson.success && subJson.data) {
              setActiveSub(subJson.data);
            }
          }
        } catch (e) {
          console.error("Error cargando suscripción:", e);
        }
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      setLoadError("Error cargando planes. Usando datos locales.");
      setPlans(FALLBACK_PLANS);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    checkStripeConfig();
  }, [loadData, checkStripeConfig]);

  /* ── Checkout unificado: usa price_id (estándar Stripe) ─────────────── */
  const handleSubscribe = async (plan: DbPlan) => {
    // ✅ Obtener sesión y token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("Debes iniciar sesión para suscribirte.", { duration: 5000 });
      return;
    }

    const token = session.access_token;
    const userId = session.user.id;

    const priceId = billingInterval === "year"
      ? (plan.stripe_price_id_anual || plan.stripe_price_id)
      : plan.stripe_price_id;

    if (!priceId) {
      toast.error("Este plan no tiene configurado un precio de Stripe. Contacta soporte.", { duration: 6000 });
      return;
    }

    setIsLoading(plan.id);
    try {
      // ✅ CORRECCIÓN: Añadir token Bearer y quitar user_id del body (lo obtiene del token)
      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          billing: billingInterval,
          plan_id: plan.id,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        const errMsg = data.error ?? "Error desconocido";
        if (errMsg.includes("STRIPE_SECRET_KEY")) {
          toast.error("Stripe no está configurado. Agrega las variables de entorno en Vercel.", { duration: 8000 });
        } else {
          toast.error(`Error: ${errMsg}`);
        }
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error("No se pudo obtener la URL de pago.");
      }
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSub?.subscription?.stripe_subscription_id) {
      toast.error("No se encontró la suscripción de Stripe.");
      return;
    }
    try {
      const res = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: activeSub.subscription.stripe_subscription_id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Suscripción cancelada. Seguirás activo hasta el final del período.");
        loadData();
      } else {
        toast.error(data.error || "Error al cancelar.");
      }
    } catch {
      toast.error("Error de conexión al cancelar.");
    }
  };

  const handleOpenPortal = async () => {
    if (!activeSub?.subscription?.stripe_customer_id) {
      toast.error("No se encontró el cliente de Stripe.");
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "No se pudo abrir el portal.");
      }
    } catch {
      toast.error("Error de conexión.");
    }
  };

  return (
    <div className="space-y-8">
      <HeroBanner />
      {!userId && <LoginRequiredBanner />}
      {activeSub && (
        <>
          <ActiveSubscriptionBanner activeSub={activeSub} />
          <SubscriptionManager
            activeSub={activeSub}
            onCancel={handleCancelSubscription}
            onOpenPortal={handleOpenPortal}
          />
        </>
      )}
      {!activeSub && userId && <TrialBanner />}
      {stripeConfigured === false && <StripeWarningBanner />}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm flex items-center justify-between">
          <span>{loadError}</span>
          <Button size="sm" variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="w-3 h-3" /> Reintentar
          </Button>
        </div>
      )}

      <BillingToggle billingInterval={billingInterval} onChange={setBillingInterval} />

      {plansLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const meta = getPlanMeta(plan.nombre);
            const priceId = billingInterval === "year"
              ? (plan.stripe_price_id_anual || plan.stripe_price_id)
              : plan.stripe_price_id;
            const canSubscribe = !!priceId && !!userId;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                meta={meta}
                index={i}
                billingInterval={billingInterval}
                isLoading={isLoading === plan.id}
                isActive={activeSub?.plan?.id === plan.id}
                isLoggedIn={!!userId}
                canSubscribe={canSubscribe}
                onSubscribe={() => {
                  if (!userId) {
                    toast.error("Inicia sesión para suscribirte");
                    return;
                  }
                  if (!priceId) {
                    toast.error("Plan no configurado para pagos. Contacta soporte.");
                    return;
                  }
                  setShowConfirmModal(plan);
                }}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrustCard icon={<Shield className="w-6 h-6 text-green-500" />} title="Pago Seguro" desc="Procesado por Stripe con cifrado SSL" />
        <TrustCard icon={<Zap className="w-6 h-6 text-yellow-500" />} title="Activación Inmediata" desc="Tu suscripción se activa al instante" />
        <TrustCard icon={<Star className="w-6 h-6 text-blue-500" />} title="Cancela Cuando Quieras" desc="Sin contratos ni penalizaciones" />
      </div>

      {stripeConfigured === false && <StripeSetupCard onOpenConfig={() => setShowStripeConfig(true)} />}
      <PaymentHistoryTable userId={userId} />
      <FaqSection />

      <AnimatePresence>
        {showStripeConfig && <StripeConfigModal onClose={() => setShowStripeConfig(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmModal && (
          <ConfirmSubscriptionModal
            plan={showConfirmModal}
            billingInterval={billingInterval}
            onConfirm={() => {
              handleSubscribe(showConfirmModal);
              setShowConfirmModal(null);
            }}
            onClose={() => setShowConfirmModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════ SUB-COMPONENTES ═══════════════════════════ */

function LoginRequiredBanner() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 border bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center shrink-0">
          <LogIn className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Inicia sesión para suscribirte</h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">Necesitas una cuenta para comenzar tu prueba gratuita.</p>
        </div>
      </div>
    </motion.div>
  );
}

function StripeWarningBanner() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1">⚠️ Stripe no está configurado</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
            Agrega estas variables en <strong>Vercel → Settings → Environment Variables</strong>:
          </p>
          <div className="space-y-1">
            {["STRIPE_SECRET_KEY (sk_...)", "STRIPE_WEBHOOK_SECRET (whsec_...)", "NEXT_PUBLIC_STRIPE_URL"].map(k => (
              <div key={k} className="text-xs font-mono bg-amber-100 dark:bg-amber-900 rounded px-2 py-1">{k}</div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActiveSubscriptionBanner({ activeSub }: { activeSub: ActiveSubscription }) {
  const { subscription, plan } = activeSub;
  const isTrialing = subscription.estado === "trialing";
  const isActive = subscription.estado === "active";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl p-5 border ${isActive || isTrialing ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
          <BadgeCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-emerald-800 text-lg">
            {isTrialing ? "🎁 Período de prueba activo" : isActive ? "✅ Suscripción activa" : `⚠️ ${subscription.estado}`}
          </h3>
          <p className="text-sm text-emerald-700">
            {plan ? (
              <>
                Plan <strong>{plan.nombre}</strong>
                {subscription.fecha_prueba_fin && isTrialing && (
                  <> · Prueba hasta el <strong>{formatDate(subscription.fecha_prueba_fin)}</strong></>
                )}
                {subscription.fecha_fin && !isTrialing && (
                  <> · Renueva el <strong>{formatDate(subscription.fecha_fin)}</strong></>
                )}
                {subscription.cancelar_al_periodo_fin && (
                  <span className="ml-2 text-amber-600 font-medium">· Se cancelará al final del período</span>
                )}
              </>
            ) : (
              "No se pudo cargar la información del plan."
            )}
          </p>
        </div>
        {subscription.cancelar_al_periodo_fin && (
          <Badge variant="outline" className="border-amber-500 text-amber-700">Cancelación programada</Badge>
        )}
      </div>
    </motion.div>
  );
}

function SubscriptionManager({
  activeSub,
  onCancel,
  onOpenPortal,
}: {
  activeSub: ActiveSubscription;
  onCancel: () => void;
  onOpenPortal: () => void;
}) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isTrialing = activeSub.subscription.estado === "trialing";
  const isActive = activeSub.subscription.estado === "active";

  if (!isActive && !isTrialing) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Gestión de suscripción</h3>
            <p className="text-xs text-muted-foreground">
              Administra tu plan, métodos de pago y facturación desde el portal de Stripe.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onOpenPortal} className="gap-2">
            <Wallet className="w-4 h-4" /> Portal de facturación
          </Button>
          {!activeSub.subscription.cancelar_al_periodo_fin && (
            <Button variant="outline" size="sm" onClick={() => setShowCancelConfirm(true)} className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Ban className="w-4 h-4" /> Cancelar suscripción
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border"
          >
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-300 text-sm mb-1">
                    ¿Cancelar tu suscripción?
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                    Seguirás teniendo acceso hasta el final del período pagado. Puedes reactivarla en cualquier momento.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>
                      Mantener suscripción
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { onCancel(); setShowCancelConfirm(false); }}>
                      Sí, cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConfirmSubscriptionModal({
  plan,
  billingInterval,
  onConfirm,
  onClose,
}: {
  plan: DbPlan;
  billingInterval: "month" | "year";
  onConfirm: () => void;
  onClose: () => void;
}) {
  const annualPrice = plan.precio_centavos_anual ?? Math.round(plan.precio_centavos * 10);
  const price = billingInterval === "year" ? annualPrice : plan.precio_centavos;
  const meta = getPlanMeta(plan.nombre);
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl overflow-hidden shadow-2xl border border-border max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Confirmar suscripción</h3>
              <p className="text-xs text-muted-foreground">Revisa los detalles antes de continuar</p>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-4 space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="font-semibold text-sm">{plan.nombre}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Facturación</span>
              <span className="font-semibold text-sm capitalize">{billingInterval === "year" ? "Anual" : "Mensual"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Prueba gratuita</span>
              <span className="font-semibold text-sm text-green-600">{plan.dias_prueba} días</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="text-sm font-medium">Total al finalizar prueba</span>
              <span className="font-bold text-lg">{formatPrice(price)} <span className="text-xs font-normal text-muted-foreground">/{billingInterval === "year" ? "año" : "mes"}</span></span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-purple-600" onClick={onConfirm}>
              <CreditCard className="w-4 h-4" /> Continuar al pago
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            Serás redirigido a Stripe para completar el pago de forma segura.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HeroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-8 md:p-12 text-center"
    >
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>
      <div className="relative z-10">
        <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
          <TrendingUp className="w-3 h-3 mr-1" /> Elige el plan perfecto
        </Badge>
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          Potencia tu labor docente
        </h1>
        <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
          Herramientas de IA diseñadas exclusivamente para maestros. Planea, evalúa y gestiona tu aula como nunca antes.
        </p>
      </div>
    </motion.div>
  );
}

function TrialBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 border bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border-violet-200 dark:border-violet-800"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-violet-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-violet-800 dark:text-violet-300 mb-1">
            🎁 Prueba gratuita de 15 días
          </h3>
          <p className="text-sm text-violet-700 dark:text-violet-400">
            Comienza cualquier plan sin costo. Cancela antes de que termine si no te convence. Sin compromisos.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function BillingToggle({
  billingInterval,
  onChange,
}: {
  billingInterval: "month" | "year";
  onChange: (v: "month" | "year") => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex items-center bg-muted rounded-full p-1 border">
        <button
          onClick={() => onChange("month")}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            billingInterval === "month"
              ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Mensual
        </button>
        <button
          onClick={() => onChange("year")}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
            billingInterval === "year"
              ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Anual
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border-green-200">
            Ahorra 2 meses
          </Badge>
        </button>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  meta,
  index,
  billingInterval,
  isLoading,
  isActive,
  isLoggedIn,
  canSubscribe,
  onSubscribe,
}: {
  plan: DbPlan;
  meta: ReturnType<typeof getPlanMeta>;
  index: number;
  billingInterval: "month" | "year";
  isLoading: boolean;
  isActive: boolean;
  isLoggedIn: boolean;
  canSubscribe: boolean;
  onSubscribe: () => void;
}) {
  const Icon = meta.icon;
  const annualPrice = plan.precio_centavos_anual ?? Math.round(plan.precio_centavos * 10);
  const displayPrice = billingInterval === "year" ? annualPrice : plan.precio_centavos;
  const monthlyEquivalent = billingInterval === "year" ? Math.round(annualPrice / 12) : plan.precio_centavos;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <Card
        className={`relative h-full flex flex-col overflow-hidden transition-all duration-300 ${
          meta.popular
            ? "ring-2 ring-violet-500 shadow-xl shadow-violet-500/10 scale-[1.02]"
            : "hover:shadow-lg border-border"
        }`}
      >
        {meta.badge && (
          <div className="absolute top-0 right-0 bg-gradient-to-l from-violet-600 to-purple-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl z-10">
            {meta.badge}
          </div>
        )}

        <CardHeader className="pb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-4 shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl">{plan.nombre}</CardTitle>
          <CardDescription>{plan.descripcion}</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">
                {formatPrice(displayPrice)}
              </span>
              <span className="text-muted-foreground text-sm">
                /{billingInterval === "year" ? "año" : "mes"}
              </span>
            </div>
            {billingInterval === "year" && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatPrice(monthlyEquivalent)} MXN/mes · Ahorras{" "}
                {formatPrice(plan.precio_centavos * 12 - annualPrice)}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Clock className="w-4 h-4 text-violet-500" />
              <span className="text-sm text-violet-700 dark:text-violet-400 font-medium">
                {plan.dias_prueba} días de prueba gratis
              </span>
            </div>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {plan.caracteristicas.map((feat, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feat}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={onSubscribe}
            disabled={isLoading || isActive || !canSubscribe}
            className={`w-full gap-2 ${
              meta.popular
                ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
                : ""
            }`}
            variant={meta.popular ? "default" : "outline"}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
              </>
            ) : isActive ? (
              <>
                <Check className="w-4 h-4" /> Plan actual
              </>
            ) : !isLoggedIn ? (
              <>
                <LogIn className="w-4 h-4" /> Inicia sesión
              </>
            ) : !canSubscribe ? (
              <>
                <AlertCircle className="w-4 h-4" /> No disponible
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" /> Suscribirme
              </>
            )}
          </Button>
          {!canSubscribe && isLoggedIn && (
            <p className="text-xs text-center text-amber-600 mt-2">
              Plan pendiente de configuración de pago.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TrustCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="text-center p-6 h-full hover:shadow-md transition-shadow">
        <div className="mx-auto w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-3">
          {icon}
        </div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </Card>
    </motion.div>
  );
}

function StripeSetupCard({ onOpenConfig }: { onOpenConfig: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center"
    >
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
        <ExternalLink className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">¿Necesitas configurar Stripe?</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
        Abre el asistente de configuración para conectar tu cuenta de Stripe y comenzar a recibir pagos.
      </p>
      <Button variant="outline" onClick={onOpenConfig} className="gap-2">
        <ExternalLink className="w-4 h-4" /> Configurar Stripe
      </Button>
    </motion.div>
  );
}

function FaqSection() {
  const faqs = [
    {
      q: "¿Puedo cancelar en cualquier momento?",
      a: "Sí, puedes cancelar tu suscripción desde tu perfil en cualquier momento. Seguirás teniendo acceso hasta que termine el período pagado.",
    },
    {
      q: "¿Qué pasa después de la prueba gratuita?",
      a: "Al finalizar los 15 días de prueba, se hará el primer cargo automáticamente al método de pago que registraste. Te avisaremos 3 días antes.",
    },
    {
      q: "¿Puedo cambiar de plan?",
      a: "Claro. Puedes actualizar o degradar tu plan en cualquier momento. Los cambios se reflejan de inmediato y se ajusta el prorrateo.",
    },
    {
      q: "¿Es seguro pagar con tarjeta?",
      a: "Absolutamente. Todos los pagos se procesan directamente por Stripe con cifrado SSL de 256 bits. Nosotros nunca almacenamos los datos de tu tarjeta.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Preguntas frecuentes</h2>
        <p className="text-muted-foreground">Todo lo que necesitas saber antes de suscribirte</p>
      </div>
      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">{faq.q}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════ PaymentHistoryTable ═════════════════════ */
function PaymentHistoryTable({ userId }: { userId: string | null }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const fetchPayments = async () => {
      setLoading(true);
      try {
        // Obtener token de sesión para autenticar la llamada
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: HeadersInit = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        
        const res = await fetch(`/api/payment-history?userId=${userId}`, { headers });
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setPayments(data);
        }
      } catch (err) {
        console.error("Error fetching payments:", err);
        if (mounted) setPayments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPayments();
    return () => { mounted = false; };
  }, [userId]);

  const statusStyles: Record<string, string> = {
    succeeded: "bg-emerald-100 text-emerald-700 border-emerald-200",
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    refunded: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const statusLabels: Record<string, string> = {
    succeeded: "Completado",
    pending: "Pendiente",
    failed: "Fallido",
    refunded: "Reembolsado",
  };

  if (!userId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Receipt className="w-5 h-5 text-violet-500" />
        <h3 className="font-semibold text-lg">Historial de pagos</h3>
      </div>
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Cargando pagos...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Método</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{p.created_at || p.fecha ? formatDateShort((p.created_at || p.fecha) as string) : "—"}</td>
                      <td className="px-4 py-3">{p.descripcion}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.metodo}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatPrice(p.monto_centavos)} {(p.moneda || "mxn").toUpperCase()}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[p.estado] ?? "bg-gray-100 text-gray-700"}`}>
                          {statusLabels[p.estado] ?? p.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ═════════════════════ StripeConfigModal ═════════════════════ */
function StripeConfigModal({ onClose }: { onClose: () => void }) {
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!secretKey.trim() || !webhookSecret.trim()) {
      toast.error("Debes completar al menos STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/stripe-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stripe_secret_key: secretKey,
          stripe_webhook_secret: webhookSecret,
          next_public_stripe_url: publicUrl,
        }),
      });
      if (res.status === 404) {
        toast.error("El endpoint /api/admin/stripe-config no existe. Configura las variables manualmente en Vercel.");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast.success("Configuración de Stripe guardada correctamente.");
        onClose();
      } else {
        toast.error(data.error || "Error guardando configuración.");
      }
    } catch {
      toast.error("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl overflow-hidden shadow-2xl border border-border max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Configurar Stripe</h3>
              <p className="text-xs text-muted-foreground">Ingresa tus credenciales de Stripe</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">Importante</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Estas credenciales se guardan de forma segura. Asegúrate de usar las claves de producción solo en producción.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">STRIPE_SECRET_KEY</label>
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="sk_live_... o sk_test_..."
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors font-mono"
            />
            <p className="text-xs text-muted-foreground">Encuéntrala en Stripe Dashboard → Developers → API Keys</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">STRIPE_WEBHOOK_SECRET</label>
            <input
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors font-mono"
            />
            <p className="text-xs text-muted-foreground">Desde Stripe Dashboard → Developers → Webhooks → Signing secret</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">NEXT_PUBLIC_STRIPE_URL (opcional)</label>
            <input
              type="text"
              value={publicUrl}
              onChange={(e) => setPublicUrl(e.target.value)}
              placeholder="https://tudominio.com"
              className="w-full bg-muted rounded-xl px-3 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="p-6 border-t border-border flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-purple-600"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar configuración
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
