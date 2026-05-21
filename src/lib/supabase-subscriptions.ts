import { supabaseAdmin } from "@/integrations/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio_centavos: number;
  precio_mensual: number;
  precio_anual: number | null;
  moneda: string;
  intervalo: "month" | "year";
  dias_prueba: number;
  stripe_price_id: string | null;
  stripe_price_id_anual: string | null;
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
  estado:
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "incomplete"
    | "incomplete_expired";
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

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verificar que supabaseAdmin esté disponible
// ─────────────────────────────────────────────────────────────────────────────
function getAdminClient() {
  if (!supabaseAdmin) {
    throw new Error("[supabase-subscriptions] supabaseAdmin no está disponible. Verifica SUPABASE_SERVICE_ROLE_KEY.");
  }
  return supabaseAdmin;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  return ["trialing", "active", "past_due"].includes(sub.estado);
}

export function isTrialing(sub: Subscription | null): boolean {
  return sub?.estado === "trialing";
}

// ─────────────────────────────────────────────────────────────────────────────
// Planes de suscripción
// ─────────────────────────────────────────────────────────────────────────────

export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[supabase-subscriptions] Error fetching plans:", error);
      return [];
    }
    return (data ?? []) as SubscriptionPlan[];
  } catch (err) {
    console.error("[supabase-subscriptions] getActivePlans error:", err);
    return [];
  }
}

export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (error) {
      console.error("[supabase-subscriptions] Error fetching plan by id:", error);
      return null;
    }
    return data as SubscriptionPlan | null;
  } catch (err) {
    console.error("[supabase-subscriptions] getPlanById error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suscripciones de usuario
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[supabase-subscriptions] Error fetching subscription:", error);
      return null;
    }
    return data as Subscription | null;
  } catch (err) {
    console.error("[supabase-subscriptions] getUserSubscription error:", err);
    return null;
  }
}

export async function getActiveUserSubscription(userId: string): Promise<Subscription | null> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .in("estado", ["trialing", "active", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[supabase-subscriptions] Error fetching active subscription:", error);
      return null;
    }
    return data as Subscription | null;
  } catch (err) {
    console.error("[supabase-subscriptions] getActiveUserSubscription error:", err);
    return null;
  }
}

export async function createSubscription(payload: {
  user_id: string;
  plan_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  estado?: string;
  metadata?: Record<string, unknown>;
}): Promise<Subscription | null> {
  try {
    const admin = getAdminClient();

    // Validar que el plan exista
    const plan = await getPlanById(payload.plan_id);
    if (!plan) {
      console.error("[supabase-subscriptions] Plan no existe:", payload.plan_id);
      return null;
    }

    const estadosPermitidos: Subscription["estado"][] = [
      "trialing", "active", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired",
    ];
    const estadoFinal = estadosPermitidos.includes(payload.estado as Subscription["estado"])
      ? (payload.estado as Subscription["estado"])
      : "trialing";

    const { data, error } = await admin
      .from("subscriptions")
      .insert({
        user_id: payload.user_id,
        plan_id: payload.plan_id,
        stripe_customer_id: payload.stripe_customer_id ?? null,
        stripe_subscription_id: payload.stripe_subscription_id ?? null,
        estado: estadoFinal,
        metadata: payload.metadata ?? {},
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[supabase-subscriptions] Error creating subscription:", error);
      return null;
    }
    return data as Subscription | null;
  } catch (err) {
    console.error("[supabase-subscriptions] createSubscription error:", err);
    return null;
  }
}

export async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  updates: Partial<{
    estado: Subscription["estado"];
    stripe_customer_id: string;
    fecha_fin: string;
    fecha_prueba_fin: string;
    cancelar_al_periodo_fin: boolean;
    metadata: Record<string, unknown>;
  }>
): Promise<Subscription | null> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("subscriptions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[supabase-subscriptions] Error updating subscription:", error);
      return null;
    }
    return data as Subscription | null;
  } catch (err) {
    console.error("[supabase-subscriptions] updateSubscriptionByStripeId error:", err);
    return null;
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<Subscription | null> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("subscriptions")
      .update({ cancelar_al_periodo_fin: true, updated_at: new Date().toISOString() })
      .eq("id", subscriptionId)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[supabase-subscriptions] Error canceling subscription:", error);
      return null;
    }
    return data as Subscription | null;
  } catch (err) {
    console.error("[supabase-subscriptions] cancelSubscription error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Historial de pagos
// ─────────────────────────────────────────────────────────────────────────────

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
}): Promise<PaymentHistoryRecord | null> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("payment_history")
      .insert({
        user_id: payload.user_id,
        subscription_id: payload.subscription_id ?? null,
        stripe_payment_intent_id: payload.stripe_payment_intent_id ?? null,
        stripe_invoice_id: payload.stripe_invoice_id ?? null,
        monto_centavos: payload.monto_centavos,
        moneda: payload.moneda ?? "mxn",
        estado: payload.estado,
        descripcion: payload.descripcion ?? null,
        metadata: payload.metadata ?? {},
        fecha_pago: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[supabase-subscriptions] Error creating payment history:", error);
      return null;
    }
    return data as PaymentHistoryRecord | null;
  } catch (err) {
    console.error("[supabase-subscriptions] createPaymentHistory error:", err);
    return null;
  }
}

export async function getUserPaymentHistory(userId: string): Promise<PaymentHistoryRecord[]> {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from("payment_history")
      .select("*")
      .eq("user_id", userId)
      .order("fecha_pago", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[supabase-subscriptions] Error fetching payment history:", error);
      return [];
    }
    return (data ?? []) as PaymentHistoryRecord[];
  } catch (err) {
    console.error("[supabase-subscriptions] getUserPaymentHistory error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeding de planes por defecto
// ─────────────────────────────────────────────────────────────────────────────

export async function seedDefaultPlans(): Promise<void> {
  try {
    const admin = getAdminClient();
    const { data: existing, error: checkError } = await admin
      .from("subscription_plans")
      .select("id")
      .eq("activo", true)
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error("[supabase-subscriptions] Error checking existing plans:", checkError);
      return;
    }

    if (existing) return;

    const defaultPlans = [
      {
        nombre: "Básico",
        descripcion: "Ideal para maestros que inician con herramientas digitales",
        precio_centavos: 9900,
        precio_mensual: 99,
        precio_anual: null,
        moneda: "mxn",
        intervalo: "month",
        dias_prueba: 15,
        stripe_price_id: null,
        stripe_price_id_anual: null,
        stripe_product_id: null,
        caracteristicas: [
          "Hasta 35 alumnos", "Registro de asistencia", "Planeaciones básicas",
          "Reportes simples", "Soporte por email",
        ],
        activo: true,
        orden: 1,
      },
      {
        nombre: "Profesional",
        descripcion: "Para maestros que quieren aprovechar al máximo la tecnología",
        precio_centavos: 19900,
        precio_mensual: 199,
        precio_anual: 1990,
        moneda: "mxn",
        intervalo: "month",
        dias_prueba: 15,
        stripe_price_id: null,
        stripe_price_id_anual: null,
        stripe_product_id: null,
        caracteristicas: [
          "Alumnos ilimitados", "Herramientas de IA incluidas", "Generación de imágenes IA",
          "Planeaciones con IA", "Evidencias y portafolio", "Comunicación con padres",
          "Reportes avanzados", "Soporte prioritario",
        ],
        activo: true,
        orden: 2,
      },
      {
        nombre: "Institucional",
        descripcion: "Para escuelas y directivos que gestionan múltiples grupos",
        precio_centavos: 49900,
        precio_mensual: 499,
        precio_anual: 4990,
        moneda: "mxn",
        intervalo: "month",
        dias_prueba: 15,
        stripe_price_id: null,
        stripe_price_id_anual: null,
        stripe_product_id: null,
        caracteristicas: [
          "Todo lo de Profesional", "Múltiples maestros", "Panel de director",
          "Gestión de grupos", "Reportes institucionales", "Integración con SEP",
          "Capacitación incluida", "Soporte 24/7 dedicado",
        ],
        activo: true,
        orden: 3,
      },
    ];

    const { error } = await admin.from("subscription_plans").insert(defaultPlans);
    if (error) {
      console.error("[supabase-subscriptions] Error seeding default plans:", error);
    } else {
      console.log("[supabase-subscriptions] ✅ Default plans seeded successfully");
    }
  } catch (err) {
    console.error("[supabase-subscriptions] seedDefaultPlans error:", err);
  }
}