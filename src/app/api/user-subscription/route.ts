import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// ── Cliente admin LAZY ──────────────
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

// ── Cliente con token del usuario (RLS) ──────────────
function getSupabaseUserClient(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
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
  try {
    // ── ESTRATEGIA 1: Token JWT en header ──
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    // ── ESTRATEGIA 2: user_id en query param (retrocompatible) ──
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get("user_id");

    let userId: string | null = null;
    let client: any = null;

    if (token) {
      // Validar token
      const supabaseUser = getSupabaseUserClient(token);
      if (supabaseUser) {
        const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
        if (!userError && userData.user) {
          userId = userData.user.id;
          client = supabaseUser;
        }
      }
    }

    // Fallback: usar user_id del query param con admin client
    if (!userId && queryUserId) {
      userId = queryUserId;
      client = getSupabaseAdmin();
      if (!client) {
        return NextResponse.json(
          { success: false, error: "Servidor no configurado para operaciones admin" } as ApiResponse,
          { status: 500 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "No autenticado. Envía el token JWT en el header Authorization o user_id en query param." } as ApiResponse,
        { status: 401 }
      );
    }

    // ── CONSULTAR SUSCRIPCIÓN ──
    const { data: subscription, error: subError } = await client
      .from("subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("[user-subscription] GET error:", subError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch subscription", details: subError.message } as ApiResponse,
        { status: 500 }
      );
    }

    // Siempre devolver estructura consistente
    if (!subscription) {
      return NextResponse.json(
        { success: true, data: { subscription: null, plan: null } } as ApiResponse,
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: { subscription, plan: subscription.plan ?? null } } as ApiResponse,
      { status: 200 }
    );

  } catch (err) {
    console.error("[user-subscription] GET unexpected error:", err);
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
  try {
    const body = await req.json();
    const { plan_id, estado, fecha_inicio, fecha_prueba_fin, fecha_fin } = body;

    // Extraer token del header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No autenticado. Envía el token JWT en el header Authorization." } as ApiResponse,
        { status: 401 }
      );
    }

    // Validar token
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
        { success: false, error: "Token inválido o expirado" } as ApiResponse,
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    if (!plan_id) {
      return NextResponse.json(
        { success: false, error: "plan_id is required" } as ApiResponse,
        { status: 400 }
      );
    }

    // Fallback admin para validar plan
    const supabaseAdmin = getSupabaseAdmin();
    const client = supabaseAdmin || supabaseUser;

    // Validar que el plan exista y esté activo
    const { data: planExists, error: planCheckError } = await client
      .from("subscription_plans")
      .select("id, nombre")
      .eq("id", plan_id)
      .eq("activo", true)
      .maybeSingle();

    if (planCheckError || !planExists) {
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
    const { data: existingSub } = await client
      .from("subscriptions")
      .select("id, estado")
      .eq("user_id", userId)
      .in("estado", ["active", "trialing"])
      .maybeSingle();

    if (existingSub) {
      console.warn(`[user-subscription] User ${userId} already has active/trialing sub: ${existingSub.id}`);
      return NextResponse.json(
        { success: true, data: existingSub, warning: "User already has an active subscription" } as ApiResponse,
        { status: 200 }
      );
    }

    // Insertar
    const insertData: any = {
      user_id: userId,
      plan_id,
      estado: estadoFinal,
    };

    if (fecha_inicio) insertData.fecha_inicio = fecha_inicio;
    if (fecha_prueba_fin) insertData.fecha_prueba_fin = fecha_prueba_fin;
    if (fecha_fin) insertData.fecha_fin = fecha_fin;

    const { data, error } = await client
      .from("subscriptions")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[user-subscription] POST insert error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create subscription", details: error.message } as ApiResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data } as ApiResponse,
      { status: 201 }
    );

  } catch (err) {
    console.error("[user-subscription] POST unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" } as ApiResponse,
      { status: 500 }
    );
  }
}