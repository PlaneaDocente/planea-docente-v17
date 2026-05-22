import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// ── Tipos manuales ────────────────────────────────────────────────────────
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
    console.error("[user-subscription] Env vars no configuradas.");
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * GET /api/user-subscription
 * 
 * Prioridad:
 * 1. Header Authorization: Bearer <token>
 * 2. Query param: ?user_id=<uuid>
 * 
 * Para leer subscriptions, usa admin client (bypass RLS) si está disponible.
 * Si no, usa user client (sujeto a RLS).
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  console.log(`[user-subscription ${requestId}] GET iniciado`);

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("user_id");

    let userId: string | null = null;
    let authMethod: "token" | "query" | "none" = "none";

    // Validar token
    if (token) {
      const supabaseUser = getSupabaseUserClient(token);
      if (supabaseUser) {
        const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
        if (!userError && userData.user) {
          userId = userData.user.id;
          authMethod = "token";
          console.log(`[user-subscription ${requestId}] Token válido: ${userId}`);
        } else {
          console.warn(`[user-subscription ${requestId}] Token inválido:`, userError?.message);
        }
      }
    }

    // Fallback: query param (menos seguro, solo si no hay token)
    if (!userId && queryUserId) {
      userId = queryUserId;
      authMethod = "query";
      console.log(`[user-subscription ${requestId}] Usando query param: ${userId}`);
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "No autenticado" } as ApiResponse,
        { status: 401 }
      );
    }

    // ── CONSULTAR SUSCRIPCIÓN ──
    // ESTRATEGIA: Usar admin client si está disponible (bypass RLS)
    // Si no, usar user client (sujeto a RLS - puede devolver vacío)
    let client = getSupabaseAdmin();
    let usingAdmin = true;

    if (!client) {
      console.warn(`[user-subscription ${requestId}] Admin no disponible. Intentando user client (puede fallar por RLS).`);
      if (token) {
        client = getSupabaseUserClient(token);
        usingAdmin = false;
      }
    }

    if (!client) {
      return NextResponse.json(
        { success: false, error: "No se pudo conectar a la base de datos. Configura SUPABASE_SERVICE_ROLE_KEY en Vercel." } as ApiResponse,
        { status: 500 }
      );
    }

    console.log(`[user-subscription ${requestId}] Consultando subscriptions para user: ${userId} (admin: ${usingAdmin})`);

    const { data: subscriptions, error: subError } = await client
      .from("subscriptions")
      .select("id, user_id, plan_id, estado, fecha_inicio, fecha_fin, fecha_prueba_fin, cancelar_al_periodo_fin, stripe_subscription_id, stripe_customer_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (subError) {
      console.error(`[user-subscription ${requestId}] Error:`, subError);
      return NextResponse.json(
        { success: false, error: "Error consultando BD", details: subError.message } as ApiResponse,
        { status: 500 }
      );
    }

    const subscription: SubscriptionRecord | null = (subscriptions && subscriptions.length > 0) ? subscriptions[0] as SubscriptionRecord : null;

    // Si no hay resultados y usamos user client, probablemente es RLS
    if (!subscription && !usingAdmin) {
      console.warn(`[user-subscription ${requestId}] Sin resultados con user client. Posible problema de RLS. Agrega SUPABASE_SERVICE_ROLE_KEY a Vercel.`);
    }

    // Consultar plan
    let plan: PlanRecord | null = null;
    if (subscription?.plan_id) {
      const { data: planData, error: planError } = await client
        .from("subscription_plans")
        .select("id, nombre, descripcion, precio_mensual, precio_anual, features, stripe_price_id_mensual, stripe_price_id_anual, activo")
        .eq("id", subscription.plan_id)
        .maybeSingle();

      if (!planError) {
        plan = planData as PlanRecord | null;
      }
    }

    if (!subscription) {
      console.log(`[user-subscription ${requestId}] No hay suscripción para user: ${userId}`);
      return NextResponse.json(
        { success: true, data: { subscription: null, plan: null } } as ApiResponse,
        { status: 200 }
      );
    }

    console.log(`[user-subscription ${requestId}] Encontrada: ${subscription.plan_id}, estado: ${subscription.estado}`);
    return NextResponse.json(
      { success: true, data: { subscription, plan } } as ApiResponse,
      { status: 200 }
    );

  } catch (err) {
    console.error(`[user-subscription ${requestId}] Error inesperado:`, err);
    return NextResponse.json(
      { success: false, error: "Error interno", details: err instanceof Error ? err.message : "Unknown" } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-subscription
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  console.log(`[user-subscription ${requestId}] POST iniciado`);

  try {
    const body = await req.json();
    const { plan_id, estado, fecha_inicio, fecha_prueba_fin, fecha_fin } = body;

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No autenticado" } as ApiResponse,
        { status: 401 }
      );
    }

    const supabaseUser = getSupabaseUserClient(token);
    if (!supabaseUser) {
      return NextResponse.json(
        { success: false, error: "Supabase no configurado" } as ApiResponse,
        { status: 500 }
      );
    }

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, error: "Token inválido" } as ApiResponse,
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    if (!plan_id) {
      return NextResponse.json(
        { success: false, error: "plan_id requerido" } as ApiResponse,
        { status: 400 }
      );
    }

    // Usar admin si disponible
    const client = getSupabaseAdmin() || supabaseUser;

    // Validar plan
    const { data: planExists } = await client
      .from("subscription_plans")
      .select("id")
      .eq("id", plan_id)
      .eq("activo", true)
      .maybeSingle();

    if (!planExists) {
      return NextResponse.json(
        { success: false, error: "Plan inválido" } as ApiResponse,
        { status: 400 }
      );
    }

    // Verificar duplicados
    const { data: existingSub } = await client
      .from("subscriptions")
      .select("id, estado")
      .eq("user_id", userId)
      .in("estado", ["active", "trialing"])
      .maybeSingle();

    if (existingSub) {
      return NextResponse.json(
        { success: true, data: existingSub, warning: "Ya tiene suscripción activa" } as ApiResponse,
        { status: 200 }
      );
    }

    const estadosPermitidos = ["trialing", "active", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired"];
    const estadoFinal = estadosPermitidos.includes(estado) ? estado : "trialing";

    const insertData: Record<string, unknown> = {
      user_id: userId,
      plan_id,
      estado: estadoFinal,
    };
    if (fecha_inicio) insertData.fecha_inicio = fecha_inicio;
    if (fecha_prueba_fin) insertData.fecha_prueba_fin = fecha_prueba_fin;
    if (fecha_fin) insertData.fecha_fin = fecha_fin;

    const { data, error } = await client
      .from("subscriptions")
      .insert([insertData as any])
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: "Error creando suscripción", details: error.message } as ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data } as ApiResponse,
      { status: 201 }
    );

  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Error interno", details: err instanceof Error ? err.message : "Unknown" } as ApiResponse,
      { status: 500 }
    );
  }
}