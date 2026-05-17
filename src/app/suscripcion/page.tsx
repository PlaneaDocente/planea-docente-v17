"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Check,
  Zap,
  Building2,
  GraduationCap,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Shield,
  Clock,
  Sparkles,
  Crown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ─── TIPOS ───
interface Plan {
  id: string;
  nombre: string;
  descripcion: string;
  precio_mensual: number;
  precio_anual: number;
  precio_centavos: number;
  precio_centavos_anual: number;
  caracteristicas: string[];
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
  activo: boolean;
  orden: number;
  popular?: boolean;
}

interface SubscriptionData {
  subscription: any | null;
  plan: Plan | null;
}

// ─── ANIMACIONES ───
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 },
  },
};

// ─── UTILIDADES ───
const formatPrice = (centavos: number) => {
  if (!centavos || centavos <= 0) return "$0";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(centavos / 100);
};

const FALLBACK_PLANS: Plan[] = [
  {
    id: "basico",
    nombre: "Básico",
    descripcion: "Ideal para maestros que inician. Hasta 35 alumnos, registro de asistencia, planeaciones básicas y reportes simples.",
    precio_mensual: 99,
    precio_anual: 990,
    precio_centavos: 9900,
    precio_centavos_anual: 99000,
    caracteristicas: [
      "Hasta 35 alumnos",
      "Registro de asistencia",
      "Planeaciones básicas",
      "Reportes simples",
    ],
    stripe_price_id: null,
    stripe_price_id_anual: null,
    activo: true,
    orden: 1,
  },
  {
    id: "profesional",
    nombre: "Profesional",
    descripcion: "Para maestros avanzados. Alumnos ilimitados, herramientas IA, generación de imágenes, planeaciones IA y reportes avanzados.",
    precio_mensual: 199,
    precio_anual: 1990,
    precio_centavos: 19900,
    precio_centavos_anual: 199000,
    caracteristicas: [
      "Alumnos ilimitados",
      "Herramientas IA",
      "Generación de imágenes IA",
      "Planeaciones con IA",
      "Comunicación con padres",
      "Reportes avanzados",
    ],
    stripe_price_id: null,
    stripe_price_id_anual: null,
    activo: true,
    orden: 2,
    popular: true,
  },
  {
    id: "institucional",
    nombre: "Institucional",
    descripcion: "Para escuelas e instituciones. Múltiples maestros, panel de director, reportes institucionales y soporte 24/7.",
    precio_mensual: 499,
    precio_anual: 4990,
    precio_centavos: 49900,
    precio_centavos_anual: 499000,
    caracteristicas: [
      "Múltiples maestros",
      "Panel de director",
      "Gestión de grupos",
      "Reportes institucionales",
      "Integración con SEP",
    ],
    stripe_price_id: null,
    stripe_price_id_anual: null,
    activo: true,
    orden: 3,
  },
];

// ─── COMPONENTE PRINCIPAL ───
export default function SuscripcionPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [user, setUser] = useState<any>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  // ─── CARGAR DATOS ───
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Verificar sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.info("Inicia sesión para ver los planes", { duration: 4000 });
        router.push("/login?redirect=/suscripcion");
        return;
      }
      setUser(session.user);

      // 2. Cargar planes desde API
      const plansRes = await fetch("/api/subscription-plans");
      let plansData: Plan[] = [];

      if (plansRes.ok) {
        const apiPlans = await plansRes.json();
        plansData = apiPlans.plans?.map((p: any) => ({
          ...p,
          precio_centavos: p.precio_centavos || p.precio_mensual * 100 || 0,
          precio_centavos_anual: p.precio_centavos_anual || p.precio_anual * 100 || 0,
        })) || [];
      }

      // Si la API falla o está vacía, usar fallback
      if (plansData.length === 0) {
        plansData = FALLBACK_PLANS;
      }

      // Verificar si Stripe está configurado (algún plan tiene price_id)
      const hasStripeIds = plansData.some(p => p.stripe_price_id || p.stripe_price_id_anual);
      setStripeConfigured(hasStripeIds);

      setPlans(plansData);

      // 3. Cargar suscripción actual
      const subRes = await fetch(`/api/user-subscription?user_id=${session.user.id}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.data || { subscription: null, plan: null });
      }
    } catch (err) {
      console.error("[SuscripcionPage] Error cargando datos:", err);
      setPlans(FALLBACK_PLANS);
      toast.error("Error al cargar planes. Mostrando información básica.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── CHECKOUT ───
  const handleCheckout = async (plan: Plan) => {
    if (!user) {
      toast.error("Debes iniciar sesión para contratar un plan");
      router.push("/login?redirect=/suscripcion");
      return;
    }

    const priceId = billing === "annual" ? plan.stripe_price_id_anual : plan.stripe_price_id;

    // ─── VALIDACIÓN CRÍTICA: ¿Stripe está configurado? ───
    if (!priceId || !priceId.startsWith("price_")) {
      toast.error(
        `⚠️ El plan "${plan.nombre}" no tiene configurado un precio de Stripe. Contacta al administrador.`,
        { duration: 6000 }
      );
      return;
    }

    setCheckoutLoading(plan.id);

    try {
      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceId,
          user_id: user.id,
          billing,
          plan_id: plan.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Manejar errores específicos del backend
        if (data.code === "STRIPE_PRICE_ID_MISSING") {
          toast.error("❌ Este plan no tiene precio de Stripe configurado.", { duration: 5000 });
        } else if (data.code === "STRIPE_RESOURCE_MISSING") {
          toast.error(`❌ ${data.message}`, { duration: 6000 });
        } else {
          toast.error(data.message || "Error al procesar el pago. Intenta de nuevo.");
        }
        return;
      }

      if (data.url) {
        toast.success("Redirigiendo a Stripe para pago seguro... 🔒");
        window.location.href = data.url;
      } else {
        toast.error("No se pudo iniciar el checkout. Intenta de nuevo.");
      }
    } catch (err) {
      console.error("[Checkout Error]", err);
      toast.error("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  // ─── RENDER: ESTADO DE CARGA ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando planes...</p>
        </div>
      </div>
    );
  }

  const currentPlanId = subscription?.plan?.id;
  const isTrialing = subscription?.subscription?.estado === "trialing";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* ─── HEADER ─── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0aDR2NGgtNHpNMjAgMjBoNHY0aC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 py-16 relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Sparkles className="w-3 h-3 mr-1" /> NEM Compatible
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Planes para la <span className="text-yellow-300">Nueva Escuela Mexicana</span>
            </h1>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Herramientas profesionales de planeación didáctica, gestión de alumnos y reportes SEP.
              Diseñados para maestros, directores e instituciones educativas.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* ─── BANNER DE SUSCRIPCIÓN ACTIVA ─── */}
        <AnimatePresence>
          {subscription?.subscription && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-800">
                        Ya tienes una suscripción <span className="capitalize">{subscription.subscription.estado}</span>.
                      </p>
                      <p className="text-sm text-emerald-600">
                        Puedes cambiar de plan o gestionarla desde tu dashboard.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Ir al Dashboard <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── ALERTA: STRIPE NO CONFIGURADO ─── */}
        {!stripeConfigured && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 mb-1">
                      ⚠️ Pagos temporalmente deshabilitados
                    </h3>
                    <p className="text-sm text-amber-700 mb-3">
                      Los planes muestran precios correctamente, pero aún no están conectados con Stripe.
                      Los botones de pago están deshabilitados hasta que el administrador configure los price_id.
                    </p>
                    <div className="bg-white/60 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                      <p className="font-medium">Para activar pagos, el administrador debe:</p>
                      <ol className="list-decimal list-inside space-y-0.5 ml-1">
                        <li>Crear productos en Stripe Dashboard</li>
                        <li>Copiar los <code>price_...</code> IDs a la tabla <code>subscription_plans</code> en Supabase</li>
                        <li>Verificar que <code>STRIPE_SECRET_KEY</code> esté en Vercel</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ─── SELECTOR MENSUAL/ANUAL ─── */}
        <div className="flex justify-center mb-10">
          <div className="bg-white rounded-full p-1.5 shadow-lg border flex items-center gap-2">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billing === "annual"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Anual
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                -20%
              </Badge>
            </button>
          </div>
        </div>

        {/* ─── GRID DE PLANES ─── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {plans.map((plan) => {
            const isCurrentPlan = currentPlanId === plan.id;
            const price = billing === "annual" ? plan.precio_centavos_anual : plan.precio_centavos;
            const priceId = billing === "annual" ? plan.stripe_price_id_anual : plan.stripe_price_id;
            const hasValidPrice = priceId && priceId.startsWith("price_");
            const isProcessing = checkoutLoading === plan.id;

            return (
              <motion.div key={plan.id} variants={cardVariants}>
                <Card
                  className={`relative h-full flex flex-col transition-all duration-300 hover:shadow-xl ${
                    plan.popular
                      ? "border-indigo-400 shadow-lg shadow-indigo-100 scale-[1.02] md:scale-105"
                      : "border-slate-200 hover:border-slate-300"
                  } ${isCurrentPlan ? "ring-2 ring-emerald-400 ring-offset-2" : ""}`}
                >
                  {/* Badge Popular */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-0 px-4 py-1 shadow-md">
                        <Crown className="w-3 h-3 mr-1" /> Más Popular
                      </Badge>
                    </div>
                  )}

                  {/* Badge Plan Actual */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-emerald-500 text-white border-0 px-3 py-1 shadow-md">
                        <Check className="w-3 h-3 mr-1" /> Plan Actual
                      </Badge>
                    </div>
                  )}

                  <CardContent className="p-6 flex-1 flex flex-col">
                    {/* Icono y nombre */}
                    <div className="text-center mb-6">
                      <div
                        className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                          plan.id === "basico"
                            ? "bg-blue-100 text-blue-600"
                            : plan.id === "profesional"
                            ? "bg-indigo-100 text-indigo-600"
                            : "bg-purple-100 text-purple-600"
                        }`}
                      >
                        {plan.id === "basico" ? (
                          <GraduationCap className="w-7 h-7" />
                        ) : plan.id === "profesional" ? (
                          <Zap className="w-7 h-7" />
                        ) : (
                          <Building2 className="w-7 h-7" />
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{plan.nombre}</h3>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{plan.descripcion}</p>
                    </div>

                    {/* Precio */}
                    <div className="text-center mb-6">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-extrabold text-slate-900">
                          {formatPrice(price)}
                        </span>
                        <span className="text-slate-500 text-sm font-medium">
                          MXN/{billing === "annual" ? "año" : "mes"}
                        </span>
                      </div>
                      {billing === "annual" && plan.precio_centavos > 0 && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Ahorras {formatPrice(plan.precio_centavos * 12 - plan.precio_centavos_anual)} al año
                        </p>
                      )}
                      <div className="flex items-center justify-center gap-1 mt-2 text-xs text-amber-600">
                        <Clock className="w-3 h-3" />
                        <span>15 días de prueba gratis</span>
                      </div>
                    </div>

                    {/* Características */}
                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.caracteristicas.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Botón de acción */}
                    <div className="space-y-2">
                      {isCurrentPlan ? (
                        <Button
                          variant="outline"
                          className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => router.push("/dashboard")}
                        >
                          <Check className="w-4 h-4 mr-2" /> Plan Activo — Ir al Dashboard
                        </Button>
                      ) : !hasValidPrice ? (
                        <Button
                          disabled
                          className="w-full bg-slate-200 text-slate-500 cursor-not-allowed"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Configuración de pago pendiente
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleCheckout(plan)}
                          disabled={isProcessing}
                          className={`w-full transition-all ${
                            plan.popular
                              ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              Elegir Plan <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                          )}
                        </Button>
                      )}

                      {/* Mensaje de seguridad */}
                      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
                        <Shield className="w-3 h-3" />
                        <span>Pago seguro por Stripe · Cancela cuando quieras</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* ─── FAQ / INFO ─── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-8">
            Preguntas frecuentes
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                q: "¿Puedo cancelar en cualquier momento?",
                a: "Sí. Cancela desde tu dashboard y seguirás con acceso hasta el final del periodo pagado.",
              },
              {
                q: "¿Qué incluye la prueba gratuita?",
                a: "15 días con todas las funciones del plan Profesional. Sin tarjeta de crédito.",
              },
              {
                q: "¿Cumplen con la NEM?",
                a: "Sí. Todos nuestros formatos y reportes siguen los lineamientos oficiales de la SEP.",
              },
              {
                q: "¿Puedo cambiar de plan?",
                a: "Claro. Upgrade o downgrade en cualquier momento desde tu dashboard.",
              },
            ].map((faq, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">{faq.q}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
