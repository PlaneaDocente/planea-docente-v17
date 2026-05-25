import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    // 1. Obtener token del header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ success: false, error: "No autorizado: falta token" }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 2. Obtener userId del token
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json({ success: false, error: "Token inválido o expirado" }, { status: 401 });
    }
    const userId = userData.user.id;

    // 3. Buscar suscripción con admin client (bypass RLS) o fallback
    const admin = getAdminClient();
    let subscription = null;
    let plan = null;

    if (admin) {
      const { data: subData, error: subError } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();  // ✅ maybeSingle() no lanza error si no hay filas
      
      if (!subError && subData) {
        subscription = subData;
      }
    } else {
      // Fallback sin admin (puede fallar por RLS)
      const { data: subData, error: subError } = await userClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!subError && subData) subscription = subData;
    }

    // 4. Si hay suscripción, obtener el plan
    if (subscription?.plan_id) {
      const planClient = admin || userClient;
      const { data: planData } = await planClient
        .from("subscription_plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .maybeSingle();
      if (planData) plan = planData;
    }

    // 5. Fallback a is_pro desde profile (solo si no hay suscripción)
    if (!subscription) {
      const profileClient = admin || userClient;
      const { data: profile } = await profileClient
        .from("profiles")
        .select("is_pro, plan_actual")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.is_pro) {
        subscription = {
          plan_id: profile.plan_actual || "profesional",
          estado: "active",
          user_id: userId,
        };
        const planClient = admin || userClient;
        const { data: planData } = await planClient
          .from("subscription_plans")
          .select("*")
          .eq("id", subscription.plan_id)
          .maybeSingle();
        if (planData) plan = planData;
      }
    }

    return NextResponse.json({
      success: true,
      data: { subscription, plan, user_id: userId },
    });

  } catch (err: any) {
    console.error("[API/user-subscription] Error:", err?.message);
    return NextResponse.json(
      { success: false, error: err?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}