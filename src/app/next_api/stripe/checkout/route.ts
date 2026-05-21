import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// ── Stripe LAZY (no inicializa si no hay key) ──────────────
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[checkout] STRIPE_SECRET_KEY no configurado.");
    return null;
  }
  return new Stripe(key, { typescript: true });
}

// ── Supabase Admin LAZY ──────────────
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

// ── Supabase con token del usuario (RLS) ──────────────
function getSupabaseUserClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// ── Helper: validar formato de price_id ──────────────
function isValidPriceFormat(priceId: string): boolean {
  if (!priceId || typeof priceId !== "string") return false;
  const trimmed = priceId.trim();
  if (!trimmed.startsWith("price_")) return false;
  if (trimmed.length < 10) return false;
  const lower = trimmed.toLowerCase();
  const invalidPatterns = ["xxx", "yyy", "zzz", "placeholder", "test_", "demo", "example", "sample", "fake"];
  if (invalidPatterns.some(p => lower.includes(p))) return false;
  return true;
}

// ── Helper: obtener usuario autenticado ──────────────
async function getAuthenticatedUser(req: NextRequest): Promise<{ userId: string; userEmail: string | null; userName: string | null; client: any } | null> {
  // Estrategia 1: Header Authorization con token del usuario
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    const supabaseUser = getSupabaseUserClient(token);
    if (supabaseUser) {
      const { data: userData, error: authErr } = await supabaseUser.auth.getUser(token);
      if (!authErr && userData?.user) {
        return { userId: userData.user.id, userEmail: userData.user.email || null, userName: userData.user.user_metadata?.full_name || null, client: supabaseUser };
      }
    }
  }

  // Estrategia 2: Session cookie (admin fallback)
  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      const { data: sessionData } = await supabaseAdmin.auth.getSession();
      if (sessionData?.session?.user) {
        return { userId: sessionData.session.user.id, userEmail: sessionData.session.user.email || null, userName: sessionData.session.user.user_metadata?.full_name || null, client: supabaseAdmin };
      }
    } catch { /* silent */ }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// GET /next_api/stripe/checkout
// 
// Modo 1 (sin session_id): Diagnóstico de configuración
// Modo 2 (con ?session_id=xxx): Verificar sesión de pago con Stripe
// ═══════════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 10);
  console.log(`[checkout ${requestId}] GET iniciado`);

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    // ─── MODO 1: Diagnóstico de configuración (sin session_id) ───
    if (!sessionId) {
      const stripe = getStripe();
      const user = await getAuthenticatedUser(req);

      const diagnostics = {
        stripe_configured: !!stripe,
        stripe_secret_key_present: !!process.env.STRIPE_SECRET_KEY,
        supabase_url_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_anon_key_present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabase_service_role_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        user_authenticated: !!user,
        user_id: user?.userId || null,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, diagnostics }, { status: 200 });
    }

    // ─── MODO 2: Verificar sesión de pago con Stripe ───
    console.log(`[checkout ${requestId}] Verificando sesión: ${sessionId}`);

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: "Stripe no está configurado", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Debes iniciar sesión", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    // Recuperar sesión de Stripe con detalles expandidos
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });

    console.log(`[checkout ${requestId}] Stripe session: payment_status=${session.payment_status}, status=${session.status}`);

    // Si el pago fue exitoso, crear/actualizar suscripción en Supabase
    if (session.payment_status === "paid" && session.status === "complete") {
      const planId = session.metadata?.plan_id || "profesional";
      const stripeSubId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      // Verificar si ya existe suscripción
      const { data: existingSub } = await user.client
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.userId)
        .eq("stripe_subscription_id", stripeSubId)
        .maybeSingle();

      if (!existingSub) {
        console.log(`[checkout ${requestId}] Creando suscripción en Supabase...`);
        const { error: insertError } = await user.client.from("subscriptions").insert({
          user_id: user.userId,
          plan_id: planId,
          estado: "active",
          stripe_subscription_id: stripeSubId,
          stripe_customer_id: stripeCustomerId,
          fecha_inicio: new Date().toISOString(),
        });

        if (insertError) {
          console.error(`[checkout ${requestId}] Error insertando:`, insertError);
        } else {
          console.log(`[checkout ${requestId}] Suscripción creada exitosamente`);
        }
      } else {
        console.log(`[checkout ${requestId}] Suscripción ya existe`);
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        payment_status: session.payment_status,
        status: session.status,
        amount_total: session.amount_total,
        currency: session.currency,
        customer_email: session.customer_details?.email,
        metadata: session.metadata,
        subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
        plan_id: session.metadata?.plan_id,
      },
    }, { status: 200 });

  } catch (err: any) {
    console.error(`[checkout ${requestId}] GET error:`, err);
    if (err.code === "resource_missing") {
      return NextResponse.json(
        { success: false, error: "Sesión no encontrada en Stripe", code: "SESSION_NOT_FOUND" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || "Error interno" },
      { status: 500 }
    );
  }
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
      console.warn(`[checkout ${requestId}] price_id faltante o inválido`);
      return NextResponse.json(
        { success: false, error: "price_id es requerido", code: "MISSING_PRICE_ID" },
        { status: 400 }
      );
    }

    if (!isValidPriceFormat(price_id)) {
      console.warn(`[checkout ${requestId}] price_id con formato inválido: ${price_id}`);
      return NextResponse.json(
        { success: false, error: `El price_id tiene formato inválido: "${price_id}". Debe empezar con "price_" y no contener palabras de prueba.`, code: "INVALID_PRICE_ID_FORMAT" },
        { status: 400 }
      );
    }

    // ─── STRIPE CONFIGURADO? ───
    const stripe = getStripe();
    if (!stripe) {
      console.error(`[checkout ${requestId}] STRIPE_SECRET_KEY no configurado`);
      return NextResponse.json(
        { success: false, error: "Stripe no está configurado en el servidor. Agrega STRIPE_SECRET_KEY en Vercel.", code: "STRIPE_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    // ─── AUTENTICACIÓN ───
    const user = await getAuthenticatedUser(req);
    if (!user) {
      console.warn(`[checkout ${requestId}] Usuario no autenticado`);
      return NextResponse.json(
        { success: false, error: "Debes iniciar sesión para realizar un pago.", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const { userId, userEmail, userName, client } = user;
    console.log(`[checkout ${requestId}] Usuario: ${userId}, Plan: ${plan_id}, Price: ${price_id}`);

    // ─── VERIFICAR PRICE_ID EN STRIPE ───
    try {
      const priceObj = await stripe.prices.retrieve(price_id);
      console.log(`[checkout ${requestId}] Price válido en Stripe: ${priceObj.id}, product: ${priceObj.product}`);
    } catch (stripeErr: any) {
      if (stripeErr.code === "resource_missing") {
        console.error(`[checkout ${requestId}] Price NO EXISTE en Stripe: ${price_id}`);
        return NextResponse.json(
          { 
            success: false, 
            error: `El price_id "${price_id}" no existe en tu cuenta de Stripe.`, 
            code: "STRIPE_RESOURCE_MISSING",
            instructions: [
              "1. Ve a https://dashboard.stripe.com/products",
              "2. Crea un producto con el precio correspondiente",
              "3. Copia el price_id (empieza con price_)",
              `4. Actualiza la tabla subscription_plans en Supabase para plan_id="${plan_id}"`,
            ]
          },
          { status: 400 }
        );
      }
      throw stripeErr;
    }

    // ─── PERFIL Y CUSTOMER ───
    let customerId: string | undefined = undefined;
    let resolvedUserName = userName;

    if (client) {
      const { data: profile } = await client
        .from("profiles")
        .select("stripe_customer_id, full_name")
        .eq("id", userId)
        .maybeSingle();

      resolvedUserName = profile?.full_name || userName;

      if (profile?.stripe_customer_id) {
        try {
          await stripe.customers.retrieve(profile.stripe_customer_id);
          customerId = profile.stripe_customer_id;
          console.log(`[checkout ${requestId}] Customer existente: ${customerId}`);
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
      console.log(`[checkout ${requestId}] Nuevo customer: ${customerId}`);
      if (client) {
        await client.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
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

    console.log(`[checkout ${requestId}] Checkout session creada: ${session.id}`);
    return NextResponse.json({ success: true, url: session.url, session_id: session.id });

  } catch (err: any) {
    console.error(`[checkout ${requestId}] Error fatal:`, err);
    return NextResponse.json(
      { success: false, error: err.message || "Error interno del servidor", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}