
import { supabaseAdmin } from "@/integrations/supabase/server";

export interface SubscriptionPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_centavos: number;
  moneda: string;
  intervalo: "month" | "year";
  dias_prueba: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  caracteristicas: string[];
  activo: boolean;
  orden: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  estado: "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete";
  fecha_inicio: string;
  fecha_fin: string | null;
  fecha_prueba_fin: string | null;
  cancelar_al_periodo_fin: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistoryRecord {
  id: string;
  user_id: string;
  subscription_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_invoice_id: string | null;
  monto_centavos: number;
  moneda: string;
  estado: "pending" | "succeeded" | "failed" | "refunded";
  descripcion: string | null;
  metadata: Record<string, unknown>;
  fecha_pago: string;
  created_at: string;
}

export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    console.error("Error fetching plans:", error);
    return [];
  }
  return (data ?? []) as SubscriptionPlan[];
}

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching subscription:", error);
    return null;
  }
  return data as Subscription | null;
}

export async function createSubscription(payload: {
  user_id: string;
  plan_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  estado?: string;
  metadata?: Record<string, unknown>;
}): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .insert({
      user_id: payload.user_id,
      plan_id: payload.plan_id,
      stripe_customer_id: payload.stripe_customer_id ?? null,
      stripe_subscription_id: payload.stripe_subscription_id ?? null,
      estado: payload.estado ?? "trialing",
      metadata: payload.metadata ?? {},
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error("Error creating subscription:", error);
    return null;
  }
  return data as Subscription | null;
}

export async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  updates: Partial<{
    estado: string;
    stripe_customer_id: string;
    fecha_fin: string;
    cancelar_al_periodo_fin: boolean;
    metadata: Record<string, unknown>;
  }>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) console.error("Error updating subscription by stripe_subscription_id:", error);
}

export async function createPaymentHistory(payload: {
  user_id: string;
  subscription_id?: string;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  monto_centavos: number;
  moneda?: string;
  estado: string;
  descripcion?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("payment_history").insert({
    user_id: payload.user_id,
    subscription_id: payload.subscription_id ?? null,
    stripe_payment_intent_id: payload.stripe_payment_intent_id ?? null,
    stripe_invoice_id: payload.stripe_invoice_id ?? null,
    monto_centavos: payload.monto_centavos,
    moneda: payload.moneda ?? "mxn",
    estado: payload.estado,
    descripcion: payload.descripcion ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) console.error("Error creating payment history:", error);
}

export async function getUserPaymentHistory(userId: string): Promise<PaymentHistoryRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("payment_history")
    .select("*")
    .eq("user_id", userId)
    .order("fecha_pago", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching payment history:", error);
    return [];
  }
  return (data ?? []) as PaymentHistoryRecord[];
}

// Seeding guard — uses a module-level flag to avoid repeated DB calls per request
let plansSeeded = false;

export async function seedDefaultPlans(): Promise<void> {
  if (plansSeeded) return;

  const { data: existing } = await supabaseAdmin
    .from("subscription_plans")
    .select("id")
    .eq("activo", true)
    .limit(1)
    .maybeSingle();

  if (existing) {
    plansSeeded = true;
    return;
  }

  const defaultPlans = [
    {
      nombre: "Básico",
      descripcion: "Ideal para maestros que inician con herramientas digitales",
      precio_centavos: 9900,
      moneda: "mxn",
      intervalo: "month",
      dias_prueba: 15,
      caracteristicas: [
        "Hasta 35 alumnos",
        "Registro de asistencia",
        "Planeaciones básicas",
        "Reportes simples",
        "Soporte por email",
      ],
      activo: true,
      orden: 1,
    },
    {
      nombre: "Profesional",
      descripcion: "Para maestros que quieren aprovechar al máximo la tecnología",
      precio_centavos: 19900,
      moneda: "mxn",
      intervalo: "month",
      dias_prueba: 15,
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
      activo: true,
      orden: 2,
    },
    {
      nombre: "Institucional",
      descripcion: "Para escuelas y directivos que gestionan múltiples grupos",
      precio_centavos: 49900,
      moneda: "mxn",
      intervalo: "month",
      dias_prueba: 15,
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
      activo: true,
      orden: 3,
    },
  ];

  const { error } = await supabaseAdmin.from("subscription_plans").insert(defaultPlans);
  if (error) {
    console.error("Error seeding default plans:", error);
  } else {
    console.log("✅ Default subscription plans seeded successfully");
    plansSeeded = true;
  }
}
