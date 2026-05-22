"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Zap,
  Shield,
  Users,
  Loader2,
  Crown,
  Building2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_mensual: number | null;
  precio_anual: number | null;
  features: string[] | null;
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
  popular?: boolean;
}

interface SubscriptionInfo {
  plan_id: string;
  estado: string;
  fecha_prueba_fin: string | null;
}

export default function SuscripcionClient() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: plansData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("activo", true)
          .order("precio_mensual", { ascending: true });

        if (plansData) {
          setPlans(plansData.map((p: any) => ({ ...p, popular: p.id === "profesional" })));
        }

        const { data: subData } = await supabase
          .from("subscriptions")
          .select("plan_id, estado, fecha_prueba_fin")
          .eq("user_id", user.id)
          .in("estado", ["active", "trialing"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subData) {
          setCurrentSubscription(subData as SubscriptionInfo);
        }
      } catch (err) {
        console.error("[SuscripcionClient] Error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSubscribe = useCallback(async (plan: Plan) => {
    setProcessingPlan(plan.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Debes iniciar sesión");
        router.push("/login");
        return;
      }

      const priceId = billingCycle === "annual" ? plan.stripe_price_id_anual : plan.stripe_price_id;
      if (!priceId || !priceId.startsWith("price_")) {
        toast.error("Plan no configurado para pagos");
        return;
      }

      const res = await fetch("/next_api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ price_id: priceId, plan_id: plan.id, billing_cycle: billingCycle }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al iniciar pago");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("No se recibió URL de checkout");
      }
    } catch (err: any) {
      console.error("[SuscripcionClient] Error:", err);
      toast.error("Error al procesar");
    } finally {
      setProcessingPlan(null);
    }
  }, [billingCycle, router]);

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_id === planId && ["active", "trialing"].includes(currentSubscription.estado);
  };

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "basico": return Shield;
      case "profesional": return Crown;
      case "institucional": return Building2;
      default: return Sparkles;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="text-muted-foreground">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Elige tu Plan</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Desbloquea todas las herramientas de PlaneaDocente. Compatible con NEM.
        </p>
        <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1 mt-4">
          <button onClick={() => setBillingCycle("monthly")} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}>Mensual</button>
          <button onClick={() => setBillingCycle("annual")} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === "annual" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"}`}>Anual <span className="text-emerald-600 text-xs">-20%</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const Icon = getPlanIcon(plan.id);
          const current = isCurrentPlan(plan.id);
          const price = billingCycle === "annual" ? plan.precio_anual : plan.precio_mensual;
          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className={`relative h-full flex flex-col ${plan.popular ? "border-indigo-200 shadow-lg" : "border-border"}`}>
                {plan.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600"><Zap className="w-3 h-3 mr-1" /> Más Popular</Badge>}
                <CardHeader className="text-center pb-4">
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                    plan.id === "basico" ? "bg-blue-100 text-blue-600" :
                    plan.id === "profesional" ? "bg-indigo-100 text-indigo-600" :
                    "bg-purple-100 text-purple-600"
                  }`}><Icon className="w-6 h-6" /></div>
                  <h3 className="text-xl font-bold">{plan.nombre}</h3>
                  <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <div className="text-center">
                    <span className="text-3xl font-bold">${price?.toLocaleString("es-MX") ?? "—"}</span>
                    <span className="text-muted-foreground text-sm">/{billingCycle === "annual" ? "año" : "mes"}</span>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {(plan.features ?? []).map((feature: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {current ? (
                    <Button disabled variant="outline" className="w-full gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Plan Actual
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={processingPlan === plan.id || !plan.stripe_price_id}
                      className={`w-full gap-2 ${plan.popular ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                    >
                      {processingPlan === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      {plan.stripe_price_id ? "Elegir Plan" : "Configurar pago"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}