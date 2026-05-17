import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// ── Cliente admin LAZY (solo se crea cuando se necesita, no en top-level) ──────────────
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("[user-subscription] SUPABASE_SERVICE_ROLE_KEY no configurado. Algunas operaciones de admin no estarán disponibles.");
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
 * Devuelve la suscripción más reciente del usuario autenticado.
 * Autenticación vía header Authorization: Bearer <token>
 */
export async function GET(req: Request) {
  try {
    // 1. Extraer token del header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return Response.json(
        { success: false, error: "No autenticado. Envía el token JWT en el header Authorization." } as ApiResponse,
        { status: 401 }
      );
    }

    // 2. Cliente con token del usuario
    const supabaseUser = getSupabaseUserClient(token);
    if (!supabaseUser) {
      return Response.json(
        { success: false, error: "Supabase no configurado" } as ApiResponse,
        { status: 500 }
      );
    }

    // 3. Validar token y obtener user_id
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) {
      return Response.json(
        { success: false, error: "Token inválido o expirado" } as ApiResponse,
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    // 4. Fallback: si no hay cliente user, usar admin (lazy)
    const supabaseAdmin = getSupabaseAdmin();
    const client = supabaseAdmin || supabaseUser;

    // 5. Consultar suscripción + plan (RLS protege si usamos userClient)
    const { data: subscription, error: subError } = await client
      .from("subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("[user-subscription] GET error:", subError);
      return Response.json(
        { success: false, error: "Failed to fetch subscription", details: subError.message } as ApiResponse,
        { status: 500 }
      );
    }

    // ⭐ Siempre devolver estructura consistente
    if (!subscription) {
      return Response.json(
        { success: true, data: { subscription: null, plan: null } } as ApiResponse,
        { status: 200 }
      );
    }

    return Response.json(
      { success: true, data: { subscription, plan: subscription.plan ?? null } } as ApiResponse,
      { status: 200 }
    );

  } catch (err) {
    console.error("[user-subscription] GET unexpected error:", err);
    return Response.json(
      { success: false, error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" } as ApiResponse,
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-subscription
 * Crea una nueva suscripción para un usuario autenticado.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plan_id, estado, fecha_inicio, fecha_prueba_fin, fecha_fin } = body;

    // 1. Extraer token del header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return Response.json(
        { success: false, error: "No autenticado" } as ApiResponse,
        { status: 401 }
      );
    }

    // 2. Cliente con token
    const supabaseUser = getSupabaseUserClient(token);
    if (!supabaseUser) {
      return Response.json(
        { success: false, error: "Supabase no configurado" } as ApiResponse,
        { status: 500 }
      );
    }

    // 3. Validar token
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) {
      return Response.json(
        { success: false, error: "Token inválido" } as ApiResponse,
        { status: 401 }
      );
    }

    const userId = userData.user.id;

    if (!plan_id) {
      return Response.json(
        { success: false, error: "plan_id is required" } as ApiResponse,
        { status: 400 }
      );
    }

    // 4. Fallback admin (lazy)
    const supabaseAdmin = getSupabaseAdmin();
    const client = supabaseAdmin || supabaseUser;

    // 5. Validar que el plan exista y esté activo
    const { data: planExists, error: planCheckError } = await client
      .from("subscription_plans")
      .select("id, nombre")
      .eq("id", plan_id)
      .eq("activo", true)
      .maybeSingle();

    if (planCheckError || !planExists) {
      return Response.json(
        { success: false, error: "Invalid or inactive plan_id" } as ApiResponse,
        { status: 400 }
      );
    }

    // 6. Sanitizar estado
    const estadosPermitidos = [
      "trialing", "active", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired"
    ];
    const estadoFinal = estadosPermitidos.includes(estado) ? estado : "trialing";

    // 7. Verificar duplicados activos
    const { data: existingSub } = await client
      .from("subscriptions")
      .select("id, estado")
      .eq("user_id", userId)
      .in("estado", ["active", "trialing"])
      .maybeSingle();

    if (existingSub) {
      console.warn(`[user-subscription] User ${userId} already has active/trialing sub: ${existingSub.id}`);
      return Response.json(
        { success: true, data: existingSub, warning: "User already has an active subscription" } as ApiResponse,
        { status: 200 }
      );
    }

    // 8. Insertar
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
      return Response.json(
        { success: false, error: "Failed to create subscription", details: error.message } as ApiResponse,
        { status: 500 }
      );
    }

    return Response.json(
      { success: true, data } as ApiResponse,
      { status: 201 }
    );

  } catch (err) {
    console.error("[user-subscription] POST unexpected error:", err);
    return Response.json(
      { success: false, error: "Internal server error", details: err instanceof Error ? err.message : "Unknown" } as ApiResponse,
      { status: 500 }
    );
  }
}