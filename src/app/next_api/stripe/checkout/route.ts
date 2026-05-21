import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { typescript: true });
}

function getSupabaseUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// GET /next_api/stripe/checkout?session_id=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");
    if (!sessionId) return NextResponse.json({ success: false, error: "session_id requerido" }, { status: 400 });

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ success: false, error: "Token requerido" }, { status: 401 });

    const supabaseUser = getSupabaseUserClient(token);
    if (!supabaseUser) return NextResponse.json({ success: false, error: "Supabase no configurado" }, { status: 500 });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });

    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ success: false, error: "Stripe no configurado" }, { status: 503 });

    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        subscription: session.subscription,
        metadata: session.metadata,
        customer: session.customer,
      },
    });
  } catch (err: any) {
    console.error("[checkout GET] error:", err);
    return NextResponse.json({ success: false, error: err.message || "Error" }, { status: 500 });
  }
}

// POST /next_api/stripe/checkout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { price_id, plan_id, billing = "month" } = body;

    if (!price_id || typeof price_id !== "string" || !price_id.startsWith("price_")) {
      return NextResponse.json({ success: false, error: "price_id inválido" }, { status: 400 });
    }

    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ success: false, error: "Stripe no configurado" }, { status: 503 });

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });

    const supabaseUser = getSupabaseUserClient(token);
    if (!supabaseUser) return NextResponse.json({ success: false, error: "Supabase error" }, { status: 500 });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });

    const userId = userData.user.id;
    const userEmail = userData.user.email;

    // Verificar price existe
    try { await stripe.prices.retrieve(price_id); } catch { return NextResponse.json({ success: false, error: "Price no existe en Stripe" }, { status: 400 }); }

    // Customer
    const { data: profile } = await supabaseUser.from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: userEmail || undefined, metadata: { supabase_user_id: userId } });
      customerId = customer.id;
      await supabaseUser.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://planeadocente.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${siteUrl}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/suscripcion?canceled=true`,
      client_reference_id: userId,
      metadata: { user_id: userId, plan_id: plan_id || "" },
      subscription_data: { metadata: { user_id: userId, plan_id: plan_id || "" }, trial_period_days: billing === "month" ? 15 : 0 },
      locale: "es",
    });

    return NextResponse.json({ success: true, url: session.url, session_id: session.id });
  } catch (err: any) {
    console.error("[checkout POST] error:", err);
    return NextResponse.json({ success: false, error: err.message || "Error" }, { status: 500 });
  }
}