import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// ── Stripe LAZY ──
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[checkout] STRIPE_SECRET_KEY no configurado.");
    return null;
  }
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

// ── Supabase Admin ──
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[checkout] SUPABASE_SERVICE_ROLE_KEY no configurado.");
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Validar price_id ──
function isValidPriceFormat(priceId: string): boolean {
  if (!priceId || typeof priceId !== "string") return false;
  const trimmed = priceId.trim();
  if (!trimmed.startsWith("price_")) return false;
  if (trimmed.length < 10) return false;
  return true;
}

// ── Obtener usuario autenticado ──
async function getAuthenticatedUser(req: NextRequest): Promise<{ userId: string; userEmail: string | null; userName: string | null } | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseUser = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: authErr } = await supabaseUser.auth.getUser(token);
    if (!authErr && userData?.user) {
      return { 
        userId: userData.user.id, 
        userEmail: userData.user.email || null, 
        userName: userData.user.user_metadata?.full_name || null 
      };
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// POST /next_api/stripe/checkout — Crear sesión de pago
// ═══════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[checkout ${requestId}] POST iniciado`);

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

    if (!isValidPriceFormat(price_id)) {
      return NextResponse.json(
        { success: false, error: `El price_id "${price_id}" tiene formato inválido. Debe empezar con "price_"`, code: "INVALID_PRICE_ID" },
        { status: 400 }
      );
    }

    // ─── STRIPE CONFIGURADO? ───
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: "Stripe no está configurado. Agrega STRIPE_SECRET_KEY en Vercel.", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    // ─── AUTENTICACIÓN ───
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Debes iniciar sesión para realizar un pago.", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const { userId, userEmail, userName } = user;
    console.log(`[checkout ${requestId}] Usuario: ${userId}, Plan: ${plan_id}, Price: ${price_id}`);

    // ─── VERIFICAR PRICE_ID EN STRIPE ───
    try {
      const priceObj = await stripe.prices.retrieve(price_id);
      console.log(`[checkout ${requestId}] Price válido: ${priceObj.id}`);
    } catch (stripeErr: any) {
      if (stripeErr.code === "resource_missing") {
        return NextResponse.json(
          { success: false, error: `El price_id "${price_id}" no existe en Stripe.`, code: "STRIPE_RESOURCE_MISSING" },
          { status: 400 }
        );
      }
      throw stripeErr;
    }

    // ─── CUSTOMER EN STRIPE ───
    const supabaseAdmin = getSupabaseAdmin();
    let customerId: string | undefined;
    let resolvedUserName = userName;

    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, full_name")
        .eq("id", userId)
        .maybeSingle();

      resolvedUserName = profile?.full_name || userName;

      if (profile?.stripe_customer_id) {
        try {
          await stripe.customers.retrieve(profile.stripe_customer_id);
          customerId = profile.stripe_customer_id;
        } catch {
          console.warn(`[checkout ${requestId}] Customer inválido, creando nuevo`);
        }
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        name: resolvedUserName || undefined,
        metadata: { supabase_user_id: userId, plan_id: plan_id || "" },
      });
      customerId = customer.id;
      if (supabaseAdmin) {
        await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
      }
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

    console.log(`[checkout ${requestId}] Checkout creado: ${session.id}`);
    return NextResponse.json({ success: true, url: session.url, session_id: session.id });

  } catch (err: any) {
    console.error(`[checkout ${requestId}] Error:`, err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /next_api/stripe/checkout — Verificar sesión
// ═══════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "session_id requerido" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: "Stripe no configurado" },
        { status: 503 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        plan_id: session.metadata?.plan_id,
      },
    });

  } catch (err: any) {
    console.error("[checkout GET] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}