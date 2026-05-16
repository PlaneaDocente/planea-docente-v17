import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// ── Cliente admin usando service role key (solo server-side) ──────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("[user-subscription] Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * GET /api/user-subscription?user_id=xxx
 * Devuelve la suscripción más reciente del usuario y su plan asociado.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return Response.json(
        { success: false, error: "user_id is required" } as ApiResponse,
        { status: 400 }
      );
    }

    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
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

    // ⭐ CORREGIDO: Siempre devolver estructura consistente
    if (!subscription) {
      return Response.json(
        { success: true, data: { subscription: null, plan: null } } as ApiResponse,
        { status: 200 }
      );
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .maybeSingle();

    if (planError) {
      console.error("[user-subscription] Plan fetch error:", planError);
    }

    return Response.json(
      { success: true, data: { subscription, plan: plan ?? null } } as ApiResponse,
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
 * Crea una nueva suscripción para un usuario.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, plan_id, estado, fecha_inicio, fecha_prueba_fin, fecha_fin } = body;

    if (!user_id || !plan_id) {
      return Response.json(
        { success: false, error: "user_id and plan_id are required" } as ApiResponse,
        { status: 400 }
      );
    }

    // Validar que el plan exista y esté activo
    const { data: planExists, error: planCheckError } = await supabaseAdmin
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

    // Sanitizar estado
    const estadosPermitidos = [
      "trialing", "active", "past_due", "canceled", "unpaid", "incomplete", "incomplete_expired"
    ];
    const estadoFinal = estadosPermitidos.includes(estado) ? estado : "trialing";

    // Verificar duplicados activos
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, estado")
      .eq("user_id", user_id)
      .in("estado", ["active", "trialing"])
      .maybeSingle();

    if (existingSub) {
      console.warn(`[user-subscription] User ${user_id} already has active/trialing sub: ${existingSub.id}`);
      return Response.json(
        { success: true, data: existingSub, warning: "User already has an active subscription" } as ApiResponse,
        { status: 200 }
      );
    }

    // ⭐ CORREGIDO: Insertar SOLO campos que existen en la tabla
    // (sin metadata porque la tabla no tiene esa columna según tu captura)
    const insertData: any = {
      user_id,
      plan_id,
      estado: estadoFinal,
    };

    if (fecha_inicio) insertData.fecha_inicio = fecha_inicio;
    if (fecha_prueba_fin) insertData.fecha_prueba_fin = fecha_prueba_fin;
    if (fecha_fin) insertData.fecha_fin = fecha_fin;

    const { data, error } = await supabaseAdmin
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
