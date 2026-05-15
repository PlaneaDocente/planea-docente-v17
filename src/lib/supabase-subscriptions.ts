import { supabaseAdmin } from "@/integrations/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** Precio mensual en centavos (para compatibilidad con Stripe) */
  precio_centavos: number;
  /** Precio mensual en pesos mexicanos (para display en UI) */
  precio_mensual: number;
  /** Precio anual en pesos mexicanos, si aplica */
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
  /** Estados oficiales de Stripe + extensiones internas */
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
// Helpers privados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determina si una suscripción otorga acceso activo al sistema.
 * Incluye trial, active y past_due (Stripe sigue otorgando acceso en past_due
 * hasta que se cancele explícitamente).
 */
export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  return ["trialing", "active", "past_due"].includes(sub.estado);
}

/**
 * Determina si una suscripción está en período de prueba.
 */
export function isTrialing(sub: Subscription | null): boolean {
  return sub?.estado === "trialing";
}

// ─────────────────────────────────────────────────────────────────────────────
// Planes de suscripción
// ─────────────────────────────────────────────────────────────────────────────

export async function getActivePlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) {
    console.error("[supabase-subscriptions] Error fetching plans:", error);
    return [];
  }
  return (data ?? []) as SubscriptionPlan[];
}

export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();

  if (error) {
    console.error("[supabase-subscriptions] Error fetching plan by id:", error);
    return null;
  }
  return data as SubscriptionPlan | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Suscripciones de usuario
// ─────────────────────────────────────────────────────────────────────────────

export async function getUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
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
}

/**
 * Obtiene la suscripción activa más reciente del usuario.
 * A diferencia de getUserSubscription, esta función filtra por estados válidos.
 */
export async function getActiveUserSubscription(
  userId: string
): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
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
}

export async function createSubscription(payload: {
  user_id: string;
  plan_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  estado?: string;
  metadata?: Record<string, unknown>;
}): Promise<Subscription | null> {
  // ── Validar que el plan exista y esté activo ───────────────────────────────
  const plan = await getPlanById(payload.plan_id);
  if (!plan) {
    console.error(
      "[supabase-subscriptions] Cannot create subscription: plan_id does not exist or is inactive.",
      payload.plan_id
    );
    return null;
  }

  // ── Sanitizar estado ─────────────────────────────────────────────────────
  const estadosPermitidos: Subscription["estado"][] = [
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "incomplete",
    "incomplete_expired",
  ];
  const estadoFinal = estadosPermitidos.includes(payload.estado as Subscription["estado"])
    ? (payload.estado as Subscription["estado"])
    : "trialing";

  const { data, error } = await supabaseAdmin
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
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .select()
    .maybeSingle();

  if (error) {
    console.error(
      "[supabase-subscriptions] Error updating subscription by stripe_subscription_id:",
      error
    );
    return null;
  }
  return data as Subscription | null;
}

/**
 * Marca una suscripción para cancelación al final del período actual.
 * No elimina el registro; solo actualiza el flag.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Subscription | null> {
  const { data, error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      cancelar_al_periodo_fin: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[supabase-subscriptions] Error canceling subscription:", error);
    return null;
  }
  return data as Subscription | null;
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
  const { data, error } = await supabaseAdmin
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
}

export async function getUserPaymentHistory(userId: string): Promise<PaymentHistoryRecord[]> {
  const { data, error } = await supabaseAdmin
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeding de planes por defecto
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserta los planes por defecto si la tabla está vacía.
 *
 * ⚠️ NOTA SOBRE SERVERLESS:
 * En arquitecturas serverless (Vercel), NO se puede confiar en variables
 * a nivel de módulo para evitar seeding repetido. Cada invocación de función
 * puede ejecutarse en una instancia nueva. Por eso, esta función SIEMPRE
 * consulta la base de datos primero (idempotencia por DB, no por memoria).
 *
 * La variable `plansSeeded` fue eliminada porque era inefectiva en serverless.
 */
export async function seedDefaultPlans(): Promise<void> {
  const { data: existing, error: checkError } = await supabaseAdmin
    .from("subscription_plans")
    .select("id")
    .eq("activo", true)
    .limit(1)
    .maybeSingle();

  if (checkError) {
    console.error("[supabase-subscriptions] Error checking existing plans:", checkError);
    return;
  }

  if (existing) {
    // Ya hay planes activos; no hacer nada.
    return;
  }

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
      precio_mensual: 199,
      precio_anual: 1990,
      moneda: "mxn",
      intervalo: "month",
      dias_prueba: 15,
      stripe_price_id: null,
      stripe_price_id_anual: null,
      stripe_product_id: null,
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
      precio_mensual: 499,
      precio_anual: 4990,
      moneda: "mxn",
      intervalo: "month",
      dias_prueba: 15,
      stripe_price_id: null,
      stripe_price_id_anual: null,
      stripe_product_id: null,
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
    console.error("[supabase-subscriptions] Error seeding default plans:", error);
  } else {
    console.log("[supabase-subscriptions] ✅ Default subscription plans seeded successfully");
  }
}
