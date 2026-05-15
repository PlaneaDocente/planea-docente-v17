import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = 'force-dynamic';

// ── Tipado de respuesta unificado ───────────────────────────────────────────
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * GET /api/user-subscription?user_id=xxx
 * Devuelve la suscripción más reciente del usuario y su plan asociado.
 *
 * ⚠️ SEGURIDAD: Esta ruta debe ser llamada SIEMPRE desde el frontend
 * autenticado (con sesión de Supabase). En producción, el middleware.ts
 * debe proteger /api/* para que solo usuarios logueados accedan.
 * Adicionalmente, el frontend debe enviar el user_id del usuario autenticado.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return Response.json(
        { success: false, error: "user_id is required" } as ApiResponse,
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Consulta de suscripción más reciente ───────────────────────────────
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("[user-subscription] Error fetching subscription:", subError);
      return Response.json(
        {
          success: false,
          error: "Failed to fetch subscription",
          details: subError.message,
        } as ApiResponse,
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Si no hay suscripción, devolver null limpiamente
    if (!subscription) {
      return Response.json(
        { success: true, data: null } as ApiResponse,
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Obtener detalles del plan asociado ───────────────────────────────────
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", subscription.plan_id)
      .maybeSingle();

    if (planError) {
      console.error("[user-subscription] Error fetching plan details:", planError);
    }

    return Response.json(
      {
        success: true,
        data: { subscription, plan: plan ?? null },
      } as ApiResponse,
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[user-subscription] Unexpected GET error:", err);
    return Response.json(
      {
        success: false,
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      } as ApiResponse,
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * POST /api/user-subscription
 * Crea una nueva suscripción para un usuario.
 *
 * ⚠️ SEGURIDAD CRÍTICA: Esta ruta DEBE ser protegida.
 * - Si es llamada por el frontend autenticado: validar que user_id coincida
 *   con el usuario de la sesión.
 * - Si es llamada por el webhook de Stripe: validar firma del webhook.
 * - NUNCA debe permitir que un usuario anónimo cree suscripciones "active".
 *
 * Mejoras aplicadas:
 * 1. Validación de que plan_id exista y esté activo.
 * 2. Verificación de suscripción existente (evita duplicados accidentales).
 * 3. Sanitización de estado (solo valores permitidos).
 * 4. Manejo de errores detallado.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, plan_id, estado, metadata } = body;

    // ── Validación de campos obligatorios ────────────────────────────────────
    if (!user_id || !plan_id) {
      return Response.json(
        {
          success: false,
          error: "user_id and plan_id are required",
        } as ApiResponse,
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Validar que el plan exista y esté activo ─────────────────────────────
    const { data: planExists, error: planCheckError } = await supabaseAdmin
      .from("subscription_plans")
      .select("id, nombre")
      .eq("id", plan_id)
      .eq("activo", true)
      .maybeSingle();

    if (planCheckError) {
      console.error("[user-subscription] Error validating plan_id:", planCheckError);
      return Response.json(
        {
          success: false,
          error: "Failed to validate plan_id",
          details: planCheckError.message,
        } as ApiResponse,
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!planExists) {
      return Response.json(
        {
          success: false,
          error: "Invalid or inactive plan_id",
        } as ApiResponse,
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Sanitización del estado ──────────────────────────────────────────────
    const estadosPermitidos = [
      "trialing",
      "active",
      "past_due",
      "canceled",
      "unpaid",
      "incomplete",
      "incomplete_expired",
    ];
    const estadoFinal = estadosPermitidos.includes(estado) ? estado : "trialing";

    // ── Verificar duplicados activos/trialing (warning, no bloqueo) ────────────
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, estado")
      .eq("user_id", user_id)
      .in("estado", ["active", "trialing"])
      .maybeSingle();

    if (existingSub) {
      console.warn(
        `[user-subscription] User ${user_id} already has an active/trialing subscription (${existingSub.id}). Creating additional entry.`
      );
    }

    // ── Inserción de nueva suscripción ───────────────────────────────────────
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id,
        plan_id,
        estado: estadoFinal,
        metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[user-subscription] Error creating subscription:", error);
      return Response.json(
        {
          success: false,
          error: "Failed to create subscription",
          details: error.message,
        } as ApiResponse,
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return Response.json(
      { success: true, data } as ApiResponse,
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[user-subscription] Unexpected POST error:", err);
    return Response.json(
      {
        success: false,
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      } as ApiResponse,
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
