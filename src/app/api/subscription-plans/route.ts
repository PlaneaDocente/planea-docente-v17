import { supabaseAdmin } from "@/integrations/supabase/server";
import { seedDefaultPlans } from "@/lib/supabase-subscriptions";

export const dynamic = 'force-dynamic';

/**
 * GET /api/subscription-plans
 * Devuelve todos los planes de suscripción activos ordenados por campo "orden".
 * El seeding de planes por defecto es no-bloqueante: si falla, no impide
 * que el usuario reciba los planes existentes en la base de datos.
 */
export async function GET() {
  try {
    // ── Seeding no-bloqueante ──────────────────────────────────────────────
    // En arquitectura serverless (Vercel) cada cold start puede ejecutar esto.
    // seedDefaultPlans debe ser idempotente (no duplicar si ya existen).
    // Se envuelve en catch para que un fallo de seeding NO rompa la ruta.
    seedDefaultPlans().catch((seedErr) => {
      console.warn("[subscription-plans] Seeding warning (non-blocking):", seedErr);
    });

    // ── Consulta de planes activos ─────────────────────────────────────────
    const { data, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[subscription-plans] Error fetching plans:", error);
      return Response.json(
        {
          success: false,
          error: "Failed to fetch subscription plans",
          details: error.message,
        },
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ── Respuesta con cache para reducir carga en DB ─────────────────────────
    return Response.json(
      { success: true, data: data ?? [] },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[subscription-plans] Unexpected route error:", err);
    return Response.json(
      {
        success: false,
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
