import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  typescript: true,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { price_id, plan_id, billing = "month" } = body;

    // ─── VALIDAR PRICE_ID ───
    if (!price_id || typeof price_id !== "string") {
      return NextResponse.json(
        { success: false, error: "price_id es requerido", code: "MISSING_PRICE_ID" },
        { status: 400 }
      );
    }

    // Rechazar placeholders
    const lowerPrice = price_id.toLowerCase();
    if (lowerPrice.includes("xxx") || lowerPrice.includes("yyy") || lowerPrice.includes("zzz")
        || lowerPrice.includes("placeholder") || lowerPrice.includes("test") || lowerPrice.includes("demo")) {
      return NextResponse.json(
        { success: false, error: "El price_id es un placeholder. Configura Stripe correctamente.", code: "PLACEHOLDER_PRICE_ID" },
        { status: 400 }
      );
    }

    if (!price_id.startsWith("price_")) {
      return NextResponse.json(
        { success: false, error: "El price_id debe empezar con price_", code: "INVALID_PRICE_ID" },
        { status: 400 }
      );
    }

    // ─── AUTENTICACIÓN ───
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (!authErr && userData?.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
      }
    }

    if (!userId) {
      try {
        const { data: sessionData } = await supabaseAdmin.auth.getSession();
        if (sessionData?.session?.user) {
          userId = sessionData.session.user.id;
          userEmail = sessionData.session.user.email || null;
        }
      } catch { /* silent */ }
    }

    if (!userId && body.user_id) {
      const { data: userCheck } = await supabaseAdmin.auth.admin.getUserById(body.user_id);
      if (userCheck?.user) {
        userId = userCheck.user.id;
        userEmail = userCheck.user.email || null;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Debes iniciar sesión para realizar un pago.", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    // ─── VERIFICAR PRICE_ID EN STRIPE ───
    try {
      await stripe.prices.retrieve(price_id);
    } catch (stripeErr: any) {
      if (stripeErr.code === "resource_missing") {
        return NextResponse.json(
          { success: false, error: `El price_id no existe en Stripe: ${price_id}`, code: "STRIPE_RESOURCE_MISSING" },
          { status: 400 }
        );
      }
      throw stripeErr;
    }

    // ─── PERFIL Y CUSTOMER ───
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", userId)
      .maybeSingle();

    userName = profile?.full_name || null;

    let customerId: string | undefined = undefined;
    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.retrieve(profile.stripe_customer_id);
        customerId = profile.stripe_customer_id;
      } catch {
        console.warn("[Checkout] Customer inválido, creando nuevo");
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        name: userName || undefined,
        metadata: { supabase_user_id: userId, plan_id: plan_id || "" },
      });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    // ─── SESIÓN CHECKOUT ───
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://planeadocente.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${siteUrl}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/suscripcion?canceled=true`,
      client_reference_id: userId,
      metadata: { user_id: userId, plan_id: plan_id || "", billing },
      subscription_data: {
        metadata: { user_id: userId, plan_id: plan_id || "" },
        trial_period_days: billing === "month" ? 15 : 0,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      locale: "es",
    });

    return NextResponse.json({ success: true, url: session.url, session_id: session.id });

  } catch (err: any) {
    console.error("[Checkout] Error fatal:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}