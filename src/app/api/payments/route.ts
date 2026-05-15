import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cliente Supabase para Route Handlers (backend).
 * Usa la ANON KEY — suficiente para lecturas públicas de suscripciones/pagos.
 */
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * GET /api/payments?user_id=xxx
 * Devuelve suscripción y pagos del usuario.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing user_id parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 1. Obtener suscripción activa
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // 2. Obtener historial de pagos
    const { data: payments, error: payError } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    const hasPaymentsTable = !payError || !payError.message?.includes("does not exist");

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        subscription: subscription || null,
        payments: hasPaymentsTable ? (payments || []) : [],
        has_active_plan: subscription
          ? subscription.status === "active" || subscription.status === "trialing"
          : false,
      },
    });
  } catch (err) {
    console.error("[API /payments] Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
