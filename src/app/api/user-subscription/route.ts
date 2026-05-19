import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// ── Tipos manuales (evitan errores 'never' cuando no hay database.types.ts) ─
interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_id: string | null;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  fecha_prueba_fin: string | null;
  cancelar_al_periodo_fin: boolean | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  created_at: string | null;
}

interface PlanRecord {
  id: string;
  nombre: string | null;
  descripcion: string | null;
  precio_mensual: number | null;
  precio_anual: number | null;
  features: string[] | null;
  stripe_price_id_mensual: string | null;
  stripe_price_id_anual: string | null;
  activo: boolean | null;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// ── Cliente admin LAZY ───────────────────────────────────────────────────
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[user-subscription] SUPABASE_SERVICE_ROLE_KEY no configurado.");
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Cliente con token del usuario (RLS) ──────────────────────────────────
function getSupabaseUserClient(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[user-subscription] NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no configurados.");
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// ── Helper: generar requestId para tracking ──────────────────────────────
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * GET /api/user-subscription
 * 
 * Métodos de autenticación soportados (en orden de prioridad):
 * 1. Header Authorization: Bearer <token>  (MÁS SEGURO)
 * 2. Query param: ?user_id=<uuid>          (retrocompatible)
 * 
 * Si no hay auth, devuelve 401.
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  console.log(`[user-subscription ${requestId}] GET iniciado`);

  try {
    // ── ESTRATEGIA 1: Token JWT en header ──
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    // ── ESTRATEGIA 2: user_id en query param (retrocompatible) ──
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("user_id");

    let userId: string | null = null;
    let client: any = null;  // any evita errores TS 'never' cuando no hay database.types.ts
    let authMethod: "token" | "query" | "none" = "none";

    if (token) {
      console.log(`[user-subscription ${requestId}] Token detectado, validando...`);
      const supabaseUser = getSupabaseUserClient(token);

      if (!supabaseUser) {
        console.error(`[user-subscription ${requestId}] No se pudo crear cliente Supabase con token. Verifica env vars.`);
        return NextResponse.json(
          { success: false, error: "Error de configuración del servidor" } as ApiResponse,
          { status: 500 }
        );
      }

      const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
      if (!userError && userData.user) {
        userId = userData.user.id;
        client = supabaseUser;
        authMethod = "token";
        console.log(`[user-subscription ${requestId}] Token válido para user: ${userId}`);
      } else {
        console.warn(`[user-subscription ${requestId}] Token inválido:`, userError?.message);
      }
    }

    // Fallback: usar user_id del query param con admin client
    if (!userId && queryUserId) {
      console.log(`[user-subscription ${requestId}] Usando query param user_id: ${queryUserId}`);
      userId = queryUserId;
      client = getSupabaseAdmin();
      authMethod = "query";

      if (!client) {
        console.error(`[user-subscription ${requestId}] Admin client no disponible. Falta SUPABASE_SERVICE_ROLE_KEY.`);
        return NextResponse.json(
          { success: false, error: "Servidor no configurado para operaciones admin" } as ApiResponse,
          { status: 500 }
        );
      }
    }

    if (!userId || !client) {
      console.warn(`[user-subscription ${requestId}] Sin autenticación. Token: ${token ? "sí" : "no"}, QueryUserId: ${queryUserId || "no"}`);
      return NextResponse.json(
        { success: false, error: "No autenticado. Envía el token JWT en el header Authorization o user_id en query param." } as ApiResponse,
        { status: 401 }
      );
    }

    // ── CONSULTAR SUSCRIPCIÓN ──
    console.log(`[user-subscription ${requestId}] Consultando suscripción para user: ${userId} (método: ${authMethod})`);

    const { data: subscriptions, error: subError } = await client
      .from("subscriptions")
      .select("id, user_id, plan_id, estado, fecha_inicio, fecha_fin, fecha_prueba_fin, cancelar_al_periodo_fin, stripe_subscription_id, stripe_customer_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subError) {
      console.error(`[user-subscription ${requestId}] Error consultando subscriptions:`, subError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch subscription", details: subError.message } as ApiResponse,
        { status: 500 }
      );
    }

    const subscription: SubscriptionRecord | null = (subscriptions && subscriptions.length > 0) ? subscriptions[0] as SubscriptionRecord : null;

    // ── CONSULTAR PLAN (separado para evitar errores de JOIN) ──
    let plan: PlanRecord | null = null;
    if (subscription?.plan_id) {
      console.log(`[user-subscription ${requestId}] Consultando plan: ${subscription.plan_id}`);
      const { data: planData, error: planError } = await client
        .from("subscription_plans")
        .select("id, nombre, descripcion, precio_mensual, precio_anual, features, stripe_price_id_mensual, stripe_price_id_anual, activo")
        .eq("id", subscription.plan_id)
        .maybeSingle();

      if (planError) {
        console.warn(`[user-subscription ${requestId}] Error consultando plan:`, planError.message);
      } else {
        plan = planData as PlanRecord | null;
        console.log(`[user-subscription ${requestId}] Plan encontrado: ${plan?.nombre || "N/A"}`);
      }
    }

    // Siempre devolver estructura consistente
    if (!subscription) {
      console.log(`[user-subscription ${requestId}] No hay suscripción activa para user: ${userId}`);
      return NextResponse.json(
        { success: true, data: { subscription: null, plan: null } } as ApiResponse,
        { status: 200 }
      );
    }

    console.log(`[user-subscription ${requestId}] Suscripción encontrada: ${subscription.id}, estado: ${subscription.estado}`);
    return NextResponse.json(
      { success: true, data: { subscription, plan } } as ApiResponse,
      { status: 200 }
    );

  } catch (err) {
    console.error(`[user-subscription ${requestId}] GET unexpected error:`, err);
    return NextResponse.json(
      { success: false, error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-subscription
 * Crea una nueva suscripción.
 * Requiere token JWT en header (no acepta user_id en body por seguridad).
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  console.log(`[user-subscription ${requestId}] POST iniciado`);

  try {
    const body = await req.json();
    const { plan_id, estado, fecha_inicio, fecha_prueba_fin, fecha_fin } = body;

    // Extraer token del header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      console.warn(`[user-subscription ${requestId}] POST sin token`);
      return NextResponse.json(
        { success: false, error: "No autenticado. Envía el token JWT en el header Authorization." } as ApiResponse,
        { status: 401 }
      );
    }

    // Validar token
    const supabaseUser = getSupabaseUserClient(token);
    if (!supabaseUser) {
      console.error(`[user-subscription ${requestId}] No se pudo crear cliente Supabase. Verifica env vars.`);
      return NextResponse.json(
        { success: false, error: "Supabase no configurado" } as ApiResponse,
        { status: 500 }
      );
    }

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) {
      console.warn(`[user-subscription ${requestId}] Token inválido:`, userError?.message);
      return NextResponse.json(
        { success: false, error: "Token inválido o expirado" } as ApiResponse,
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    console.log(`[user-subscription ${requestId}] POST user autenticado: ${userId}`);

    if (!plan_id) {
      return NextResponse.json(
        { success: false, error: "plan_id is required" } as ApiResponse,
        { status: 400 }
      );
    }

    // Usar admin para validar plan (si disponible), sino user client
    const supabaseAdmin = getSupabaseAdmin();
    const client: any = supabaseAdmin || supabaseUser;  // any evita errores TS

    if (!client) {
      return NextResponse.json(
        { success: false, error: "No se pudo conectar a la base de datos" } as ApiResponse,
        { status: 500 }
      );
    }

    // Validar que el plan exista y esté activo
    console.log(`[user-subscription ${requestId}] Validando plan: ${plan_id}`);
    const { data: planExists, error: planCheckError } = await client
      .from("subscription_plans")
      .select("id, nombre")
      .eq("id", plan_id)
      .eq("activo", true)
      .maybeSingle();

    if (planCheckError || !planExists) {
      console.warn(`[user-subscription ${requestId}] Plan inválido o inactivo: ${plan_id}`);
      return NextResponse.json(
        { success: false, error: "Invalid or inactive plan_id" } as ApiResponse,
        { status: 400 }
      );
    }

    // Sanitizar estado
    const estadosPermitidos = [
      "trialing", "active", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired"
    ];
    const estadoFinal = estadosPermitidos.includes(estado) ? estado : "trialing";

    // Verificar duplicados activos
    console.log(`[user-subscription ${requestId}] Verificando duplicados para user: ${userId}`);
    const { data: existingSub } = await client
      .from("subscriptions")
      .select("id, estado")
      .eq("user_id", userId)
      .in("estado", ["active", "trialing"])
      .maybeSingle();

    if (existingSub) {
      console.warn(`[user-subscription ${requestId}] User ${userId} ya tiene sub activa: ${(existingSub as any).id}`);
      return NextResponse.json(
        { success: true, data: existingSub, warning: "User already has an active subscription" } as ApiResponse,
        { status: 200 }
      );
    }

    // Insertar
    const insertData: Record<string, unknown> = {
      user_id: userId,
      plan_id,
      estado: estadoFinal,
    };

    if (fecha_inicio) insertData.fecha_inicio = fecha_inicio;
    if (fecha_prueba_fin) insertData.fecha_prueba_fin = fecha_prueba_fin;
    if (fecha_fin) insertData.fecha_fin = fecha_fin;

    console.log(`[user-subscription ${requestId}] Insertando suscripción...`);
    const { data, error } = await client
      .from("subscriptions")
      .insert([insertData as any])  // cast a any para evitar TS 2345 'never[]'
      .select()
      .maybeSingle();

    if (error) {
      console.error(`[user-subscription ${requestId}] Error insertando:`, error);
      return NextResponse.json(
        { success: false, error: "Failed to create subscription", details: error.message } as ApiResponse,
        { status: 500 }
      );
    }

    console.log(`[user-subscription ${requestId}] Suscripción creada: ${(data as any)?.id}`);
    return NextResponse.json(
      { success: true, data } as ApiResponse,
      { status: 201 }
    );

  } catch (err) {
    console.error(`[user-subscription ${requestId}] POST unexpected error:`, err);
    return NextResponse.json(
      { success: false, error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" } as ApiResponse,
      { status: 500 }
    );
  }
}