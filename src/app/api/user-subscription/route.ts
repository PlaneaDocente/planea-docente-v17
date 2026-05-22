import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════════
   CLIENTE ADMIN (Service Role) — Solo servidor, nunca expuesto
   ═══════════════════════════════════════════════════════════ */
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.warn("[API/user-subscription] SUPABASE_SERVICE_ROLE_KEY no configurada. Usando cliente normal (puede fallar por RLS).");
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/* ═══════════════════════════════════════════════════════════
   GET /api/user-subscription
   ═══════════════════════════════════════════════════════════ */
export async function GET(req: NextRequest) {
  try {
    // 1. Extraer token del header Authorization
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "No autorizado: falta token" },
        { status: 401 }
      );
    }

    // 2. Crear cliente con token de usuario para validar quién es
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    });

    // 3. Obtener user_id del token
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, error: "Token inválido o expirado" },
        { status: 401 }
      );
    }
    const userId = userData.user.id;

    // 4. Buscar suscripción con ADMIN client (bypass RLS)
    const admin = getAdminClient();
    let subscription = null;
    let plan = null;

    if (admin) {
      // Usar service role: leer directamente sin RLS
      const { data: subData, error: subError } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!subError && subData) {
        subscription = subData;
      } else {
        console.log("[API/user-subscription] Admin query result:", subError?.message || "No subscription found");
      }
    } else {
      // Fallback: intentar con cliente de usuario (puede fallar por RLS)
      const { data: subData, error: subError } = await userClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!subError && subData) {
        subscription = subData;
      }
    }

    // 5. Si hay suscripción, buscar el plan asociado
    if (subscription?.plan_id) {
      const planClient = admin || userClient;
      const { data: planData } = await planClient
        .from("subscription_plans")
        .select("*")
        .eq("id", subscription.plan_id)
        .single();
      if (planData) plan = planData;
    }

    // 6. Fallback: si no hay suscripción pero profile.is_pro = true
    if (!subscription) {
      const profileClient = admin || userClient;
      const { data: profile } = await profileClient
        .from("profiles")
        .select("is_pro, plan_actual")
        .eq("id", userId)
        .single();

      if (profile?.is_pro) {
        subscription = {
          plan_id: profile.plan_actual || "profesional",
          estado: "active",
          user_id: userId,
        };
        // Buscar plan
        const planClient = admin || userClient;
        const { data: planData } = await planClient
          .from("subscription_plans")
          .select("*")
          .eq("id", subscription.plan_id)
          .single();
        if (planData) plan = planData;
      }
    }

    // 7. Responder
    return NextResponse.json({
      success: true,
      data: {
        subscription,
        plan,
        user_id: userId,
      },
    });

  } catch (err: any) {
    console.error("[API/user-subscription] Error:", err?.message);
    return NextResponse.json(
      { success: false, error: err?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}