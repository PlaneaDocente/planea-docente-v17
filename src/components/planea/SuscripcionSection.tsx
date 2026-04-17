
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Check, Star, Zap, Shield, Clock,
  Crown, AlertCircle, Loader2, CheckCircle2,
  Gift, ExternalLink, TrendingUp, RefreshCw,
  BadgeCheck, Info, LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import StripeConfigModal from "./StripeConfigModal";
import PaymentHistoryTable from "./PaymentHistoryTable";

interface DbPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_centavos: number;
  moneda: string;
  intervalo: "month" | "year";
  dias_prueba: number;
  stripe_price_id: string | null;
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
  };
  plan: DbPlan | null;
}

// Fallback static plans when DB has no data yet
const FALLBACK_PLANS: DbPlan[] = [
  {
    id: "basico",
    nombre: "Básico",
    precio_centavos: 9900,
    moneda: "mxn",
    intervalo: "month",
    dias_prueba: 15,
    stripe_price_id: null,
    descripcion: "Ideal para maestros que inician con herramientas digitales",
    activo: true,
    orden: 1,
    caracteristicas: [
      "Hasta 35 alumnos",
      "Registro de asistencia",
      "Planeaciones básicas",
      "Reportes simples",
      "Soporte por email",
    ],
  },
  {
    id: "profesional",
    nombre: "Profesional",
    precio_centavos: 19900,
    moneda: "mxn",
    intervalo: "month",
    dias_prueba: 15,
    stripe_price_id: null,
    descripcion: "Para maestros que quieren aprovechar al máximo la tecnología",
    activo: true,
    orden: 2,
    caracteristicas: [
      "Alumnos ilimitados",
      "Herramientas de IA incluidas",
      "Generación de imágenes IA",
      "Planeaciones con IA",
      "Evidencias y portafolio",
      "Comunicación con padres",
      "Reportes avanzados",
      "Soporte prioritario",
    ],
  },
  {
    id: "institucional",
    nombre: "Institucional",
    precio_centavos: 49900,
    moneda: "mxn",
    intervalo: "month",
    dias_prueba: 15,
    stripe_price_id: null,
    descripcion: "Para escuelas y directivos que gestionan múltiples grupos",
    activo: true,
    orden: 3,
    caracteristicas: [
      "Todo lo de Profesional",
      "Múltiples maestros",
      "Panel de director",
      "Gestión de grupos",
      "Reportes institucionales",
      "Integración con SEP",
      "Capacitación incluida",
      "Soporte 24/7 dedicado",
    ],
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
  return new Date(dateStr).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SuscripcionSection() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showStripeConfig, setShowStripeConfig] = useState(false);
  const [plans, setPlans] = useState<DbPlan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSubscription | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [plansLoading, setPlansLoading] = useState(true);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);

  const checkStripeConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setStripeConfigured(json.stripe_secret_key === "configured");
    } catch {
      setStripeConfigured(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setPlansLoading(true);
    try {
      const [plansRes, sessionData] = await Promise.all([
        fetch("/api/subscription-plans"),
        supabase.auth.getSession(),
      ]);

      const plansJson = await plansRes.json();
      if (plansJson.success && plansJson.data?.length > 0) {
        setPlans(plansJson.data);
      } else {
        setPlans(FALLBACK_PLANS);
      }

      const uid = sessionData.data?.session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const subRes = await fetch(`/api/user-subscription?user_id=${uid}`);
        const subJson = await subRes.json();
        if (subJson.success && subJson.data) {
          setActiveSub(subJson.data);
        }
      }
    } catch (err) {
      console.error("Error loading subscription data:", err);
      setPlans(FALLBACK_PLANS);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    checkStripeConfig();
  }, [loadData, checkStripeConfig]);

  const handleSubscribe = async (plan: DbPlan) => {
    // Guard: user must be authenticated
    if (!userId) {
      toast.error(
        "Debes iniciar sesión para suscribirte. Por favor inicia sesión y vuelve a intentarlo.",
        { duration: 5000 }
      );
      return;
    }

    if (stripeConfigured === false) {
      toast.error(
        "Stripe no está configurado. Agrega STRIPE_SECRET_KEY en las variables de entorno de Vercel.",
        { duration: 6000 }
      );
      return;
    }

    setIsLoading(plan.id);
    const annualPrice = Math.round(plan.precio_centavos * 10);
    const unitAmount = billingInterval === "year" ? annualPrice : plan.precio_centavos;

    try {
      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: `PlaneaDocente ${plan.nombre} - ${billingInterval === "year" ? "Anual" : "Mensual"}`,
          amount: unitAmount,
          currency: plan.moneda ?? "mxn",
          quantity: 1,
          interval: billingInterval,
          planId: plan.id,
          userId: userId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        const errMsg = data.error ?? "Error desconocido";
        if (errMsg.includes("STRIPE_SECRET_KEY")) {
          toast.error(
            "Stripe no está configurado. Agrega STRIPE_SECRET_KEY en Vercel → Settings → Environment Variables.",
            { duration: 8000 }
          );
        } else {
          toast.error(`Error al iniciar el pago: ${errMsg}`);
        }
        return;
      }

      if (data?.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error("No se pudo obtener la URL de pago. Verifica la configuración de Stripe.");
      }
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <HeroBanner />

      {stripeConfigured === false && <StripeWarningBanner />}

      {!userId && <LoginRequiredBanner />}

      {activeSub && <ActiveSubscriptionBanner activeSub={activeSub} />}

      {!activeSub && userId && <TrialBanner />}

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
                onSubscribe={handleSubscribe}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TrustCard icon={<Shield className="w-6 h-6 text-green-500" />} title="Pago Seguro" desc="Procesado por Stripe con cifrado SSL de 256 bits" />
        <TrustCard icon={<Zap className="w-6 h-6 text-yellow-500" />} title="Activación Inmediata" desc="Tu suscripción se activa al instante después del pago" />
        <TrustCard icon={<Star className="w-6 h-6 text-blue-500" />} title="Cancela Cuando Quieras" desc="Sin contratos ni penalizaciones por cancelación" />
      </div>

      <StripeSetupCard onOpenConfig={() => setShowStripeConfig(true)} />

      <PaymentHistoryTable />

      <FaqSection />

      <AnimatePresence>
        {showStripeConfig && (
          <StripeConfigModal onClose={() => setShowStripeConfig(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function LoginRequiredBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 border bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center shrink-0">
          <LogIn className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-1">
            Inicia sesión para suscribirte
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            Necesitas una cuenta para comenzar tu prueba gratuita. Inicia sesión o regístrate gratis
            para continuar con el proceso de pago.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function StripeWarningBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-1">
            ⚠️ Stripe no está configurado
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-2">
            Para activar los pagos, agrega las siguientes variables de entorno en{" "}
            <strong>Vercel → Settings → Environment Variables</strong>:
          </p>
          <div className="space-y-1">
            {[
              { key: "STRIPE_SECRET_KEY", hint: "sk_live_... o sk_test_..." },
              { key: "STRIPE_WEBHOOK_SECRET", hint: "whsec_..." },
              { key: "NEXT_PUBLIC_STRIPE_URL", hint: "https://planeadocente.com" },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-xs font-mono bg-amber-100 dark:bg-amber-900 rounded-lg px-3 py-1.5">
                <span className="font-bold text-amber-800 dark:text-amber-300">{item.key}</span>
                <span className="text-amber-600 dark:text-amber-500">= {item.hint}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
            Después de agregar las variables, haz un nuevo deploy en Vercel para que surtan efecto.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ActiveSubscriptionBanner({ activeSub }: { activeSub: ActiveSubscription }) {
  const { subscription, plan } = activeSub;
  const isTrialing = subscription.estado === "trialing";
  const isActive = subscription.estado === "active";

  const statusColor = isActive || isTrialing
    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
    : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 border ${statusColor}`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center shrink-0">
          <BadgeCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">
            {isTrialing ? "🎁 Período de prueba activo" : isActive ? "✅ Suscripción activa" : `⚠️ Suscripción ${subscription.estado}`}
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Plan: <strong>{plan?.nombre ?? "—"}</strong>
            {isTrialing && subscription.fecha_prueba_fin && (
              <> · Prueba hasta: {formatDate(subscription.fecha_prueba_fin)}</>
            )}
            {isActive && subscription.fecha_fin && (
              <> · Próximo cobro: {formatDate(subscription.fecha_fin)}</>
            )}
            {subscription.cancelar_al_periodo_fin && (
              <span className="ml-2 text-amber-600"> · Se cancela al final del período</span>
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function HeroBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl"
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <CreditCard className="w-10 h-10" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-3xl font-bold mb-2">Planes y Suscripciones</h2>
          <p className="text-white/80 text-lg mb-1">Elige el plan perfecto para ti</p>
          <p className="text-white/60 text-sm">Pagos seguros con Stripe · Cancela cuando quieras · 15 días de prueba gratis</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {["💳 Pago seguro con Stripe", "🔒 Datos protegidos", "✅ Cancela cuando quieras"].map((f) => (
            <div key={f} className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TrialBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center shrink-0">
          <Gift className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-300 text-lg">
            🎁 15 días de prueba GRATIS en todos los planes
          </h3>
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Prueba PlaneaDocente sin costo. No se te cobrará nada hasta que termine tu período de prueba.
            Cancela en cualquier momento sin penalización.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900 rounded-xl px-4 py-3 shrink-0">
          <Clock className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-xs text-emerald-600 font-medium">Prueba gratuita</p>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">15 días</p>
          </div>
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
    <div className="flex items-center justify-center gap-4">
      <span className={`text-sm font-medium ${billingInterval === "month" ? "text-foreground" : "text-muted-foreground"}`}>
        Mensual
      </span>
      <button
        onClick={() => onChange(billingInterval === "month" ? "year" : "month")}
        className={`relative w-14 h-7 rounded-full transition-colors ${
          billingInterval === "year" ? "bg-primary" : "bg-muted-foreground/30"
        }`}
      >
        <div
          className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
            billingInterval === "year" ? "translate-x-7" : "translate-x-0.5"
          }`}
        />
      </button>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${billingInterval === "year" ? "text-foreground" : "text-muted-foreground"}`}>
          Anual
        </span>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 text-xs font-bold">
          Ahorra 2 meses
        </Badge>
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
  onSubscribe,
}: {
  plan: DbPlan;
  meta: { gradient: string; icon: React.ElementType; badge?: string; popular?: boolean };
  index: number;
  billingInterval: "month" | "year";
  isLoading: boolean;
  isActive: boolean;
  isLoggedIn: boolean;
  onSubscribe: (plan: DbPlan) => void;
}) {
  const Icon = meta.icon;
  const annualPrice = Math.round(plan.precio_centavos * 10);
  const annualSavings = plan.precio_centavos * 12 - annualPrice;
  const monthlyEquivalent =
    billingInterval === "year" ? Math.round(annualPrice / 12) : plan.precio_centavos;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative bg-card rounded-2xl border shadow-sm overflow-hidden flex flex-col ${
        meta.popular ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" : "border-border"
      } ${isActive ? "ring-2 ring-emerald-500" : ""}`}
    >
      {meta.popular && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-purple-600" />
      )}
      {isActive && (
        <div className="absolute top-3 right-3 z-10">
          <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Activo
          </span>
        </div>
      )}

      <div className={`bg-gradient-to-br ${meta.gradient} p-6 text-white`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold">{plan.nombre}</h3>
          </div>
          {meta.badge && (
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-bold">
              {meta.badge}
            </span>
          )}
        </div>
        <div className="flex items-end gap-1 mb-1">
          <span className="text-4xl font-bold">{formatPrice(monthlyEquivalent)}</span>
          <span className="text-white/70 text-sm mb-1">/mes</span>
        </div>
        {billingInterval === "year" ? (
          <p className="text-white/70 text-xs">
            {formatPrice(annualPrice)} al año · Ahorras {formatPrice(annualSavings)}
          </p>
        ) : (
          <p className="text-white/70 text-xs">Facturado mensualmente</p>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="mb-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-3 py-2 flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            {plan.dias_prueba} días de prueba gratis incluidos
          </p>
        </div>

        <ul className="space-y-2.5 flex-1 mb-6">
          {(plan.caracteristicas ?? []).map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        <Button
          onClick={() => onSubscribe(plan)}
          disabled={isLoading || isActive}
          className={`w-full gap-2 font-semibold ${
            meta.popular
              ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              : ""
          }`}
          variant={meta.popular ? "default" : "outline"}
        >
          {isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
          ) : isActive ? (
            <><CheckCircle2 className="w-4 h-4" /> Plan Actual</>
          ) : !isLoggedIn ? (
            <><LogIn className="w-4 h-4" /> Iniciar sesión para suscribirse</>
          ) : (
            <><CreditCard className="w-4 h-4" /> Comenzar prueba gratis</>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Sin cargo por {plan.dias_prueba} días · Cancela cuando quieras
        </p>
      </div>
    </motion.div>
  );
}

function TrustCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StripeSetupCard({ onOpenConfig }: { onOpenConfig: () => void }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Configuración de Stripe</CardTitle>
          <CardDescription>Conecta tu cuenta de Stripe para recibir pagos</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenConfig}>
          <CreditCard className="w-4 h-4 mr-2" />
          Ver instrucciones
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { label: "STRIPE_SECRET_KEY", desc: "Clave secreta del servidor (sk_live_...)", icon: Shield },
            { label: "STRIPE_WEBHOOK_SECRET", desc: "Para confirmar pagos (whsec_...)", icon: TrendingUp },
            { label: "NEXT_PUBLIC_STRIPE_URL", desc: "https://planeadocente.com", icon: Info },
          ].map((item) => {
            const ItemIcon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                <ItemIcon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-mono font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
            📋 Pasos para activar los pagos en Vercel:
          </p>
          <ol className="text-xs text-blue-600 dark:text-blue-400 space-y-1 pl-4 list-decimal">
            <li>Ve a <strong>Vercel → tu proyecto → Settings → Environment Variables</strong></li>
            <li>Agrega las 3 variables de arriba con sus valores reales</li>
            <li>Para <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">NEXT_PUBLIC_STRIPE_URL</code> usa: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">https://planeadocente.com</code></li>
            <li>Haz un nuevo deploy (Deployments → Redeploy)</li>
            <li>
              Configura el webhook en{" "}
              <a
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Stripe Dashboard → Webhooks
              </a>
              {" "}apuntando a:{" "}
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">
                https://planeadocente.com/next_api/stripe/webhook
              </code>
            </li>
            <li>
              Selecciona los eventos:{" "}
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">checkout.session.completed</code>,{" "}
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">payment_intent.succeeded</code>,{" "}
              <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">payment_intent.payment_failed</code>
            </li>
          </ol>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Obtén tus claves en{" "}
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline inline-flex items-center gap-1"
          >
            dashboard.stripe.com <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

function FaqSection() {
  const faqs = [
    { q: "¿Cuándo se me cobra?", a: "No se te cobra nada durante los primeros 15 días. Al terminar la prueba, se realiza el primer cobro automáticamente." },
    { q: "¿Puedo cancelar en cualquier momento?", a: "Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de Stripe. No hay penalizaciones." },
    { q: "¿Qué métodos de pago aceptan?", a: "Aceptamos todas las tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de Stripe." },
    { q: "¿Puedo cambiar de plan?", a: "Sí, puedes cambiar de plan mensual a anual o viceversa en cualquier momento. El cambio aplica al siguiente ciclo." },
    { q: "¿Mis datos están seguros?", a: "Sí. Stripe es el procesador de pagos más seguro del mundo. Nunca almacenamos datos de tu tarjeta." },
    { q: "¿Cómo configuro el webhook de Stripe?", a: "En Stripe Dashboard → Developers → Webhooks, agrega el endpoint: https://planeadocente.com/next_api/stripe/webhook y selecciona los eventos: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed." },
    { q: "¿Necesito iniciar sesión para suscribirme?", a: "Sí, necesitas una cuenta en PlaneaDocente para suscribirte. Esto nos permite vincular tu suscripción a tu perfil y activar las funciones premium automáticamente." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          Preguntas Frecuentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <p className="text-sm font-semibold text-foreground mb-1">{faq.q}</p>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
