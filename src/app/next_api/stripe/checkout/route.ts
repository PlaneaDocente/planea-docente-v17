import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ─── VALIDACIÓN DE ENTORNO ───
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error("[Checkout] FATAL: STRIPE_SECRET_KEY no está configurado");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[Checkout] FATAL: Variables de Supabase no configuradas");
}

// ─── STRIPE CLIENT ───
// No especificamos apiVersion para que Stripe use la última estable automáticamente
const stripe = new Stripe(STRIPE_SECRET_KEY || "sk_test_placeholder", {
  typescript: true,
});

// ─── SUPABASE ADMIN CLIENT ───
const supabaseAdmin = createClient(
  SUPABASE_URL || "",
  SUPABASE_SERVICE_KEY || "",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

/**
 * POST /next_api/stripe/checkout
 * Crea una sesión de Stripe Checkout con validación completa y seguridad reforzada.
 * 
 * Payload esperado: { price_id, billing?, plan_id }
 * NOTA: user_id se obtiene EXCLUSIVAMENTE de la sesión autenticada. Nunca del body.
 */
export async function POST(req: NextRequest) {
  try {
    // ── 1. VERIFICAR ENTORNO ────────────────────────────────────────────
    if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === "sk_test_placeholder") {
      return NextResponse.json(
        {
          success: false,
          error: "Stripe no está configurado en el servidor.",
          code: "STRIPE_NOT_CONFIGURED",
          detail: "Agrega STRIPE_SECRET_KEY a las variables de entorno de Vercel.",
        },
        { status: 500 }
      );
    }

    // ── 2. OBTENER USUARIO AUTENTICADO (SOLO del token, NUNCA del body) ──
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;

    // Intentar obtener de Authorization header
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (!authErr && userData.user) {
        userId = userData.user.id;
        userEmail = userData.user.email || null;
      }
    }

    // Fallback: obtener de cookie session
    if (!userId) {
      const { data: sessionData, error: sessionErr } = await supabaseAdmin.auth.getSession();
      if (!sessionErr && sessionData?.session?.user) {
        userId = sessionData.session.user.id;
        userEmail = sessionData.session.user.email || null;
      }
    }

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Debes iniciar sesión para realizar un pago.",
          code: "UNAUTHENTICATED",
        },
        { status: 401 }
      );
    }

    // ── 3. PARSEAR Y VALIDAR BODY ──────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Body JSON inválido", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const priceId = body.price_id;
    const planId = body.plan_id ?? body.planId ?? null;
    const billing: "month" | "year" =
      body.billing === "year" || body.billing === "annual" ? "year" : "month";

    // ── 4. VALIDAR PRICE_ID ─────────────────────────────────────────────
    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return NextResponse.json(
        {
          success: false,
          error: "El price_id es inválido o no está configurado para este plan.",
          code: "INVALID_PRICE_ID",
          detail: "Ve a Stripe Dashboard → Products, crea precios, y copia los price_... IDs a Supabase.",
        },
        { status: 400 }
      );
    }

    // ── 5. VERIFICAR QUE EL PRICE_ID EXISTE EN STRIPE ────────────────────
    try {
      await stripe.prices.retrieve(priceId);
    } catch (stripeErr: any) {
      if (stripeErr.code === "resource_missing") {
        return NextResponse.json(
          {
            success: false,
            error: `El price_id "${priceId}" no existe en tu cuenta de Stripe.`,
            code: "STRIPE_RESOURCE_MISSING",
            detail: "Verifica que el precio esté creado en Stripe Dashboard y que uses la API key correcta.",
          },
          { status: 400 }
        );
      }
      throw stripeErr;
    }

    // ── 6. OBTENER PERFIL DEL USUARIO ────────────────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, avatar_url, stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      console.error("[Checkout] Error consultando perfil:", profileError);
    }

    userEmail = profile?.email || userEmail;
    userName = profile?.full_name || null;

    // ── 7. CREAR O RECUPERAR CUSTOMER EN STRIPE ─────────────────────────
    let customerId: string | undefined = undefined;

    // Primero intentar usar el guardado en profiles
    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.retrieve(profile.stripe_customer_id);
        customerId = profile.stripe_customer_id;
      } catch {
        console.warn("[Checkout] Customer Stripe guardado no existe, creando nuevo...");
      }
    }

    // Si no hay customerId válido, crear uno nuevo
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        name: userName || undefined,
        metadata: {
          supabase_user_id: userId,
          plan_id: planId || "",
          source: "planeadocente_checkout",
        },
      });
      customerId = customer.id;

      // Guardar en profiles para futuras referencias
      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);

      if (updateErr) {
        console.error("[Checkout] No se pudo guardar stripe_customer_id en profiles:", updateErr);
      }
    }

    // ── 8. CONSTRUIR URLS ──────────────────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://planeadocente.com";

    // ── 9. CREAR SESIÓN DE CHECKOUT ─────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/suscripcion?canceled=true`,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan_id: planId || "",
        billing,
        app: "planeadocente",
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_id: planId || "",
          app: "planeadocente",
        },
        trial_period_days: billing === "month" ? 15 : 0,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      custom_text: {
        submit: {
          message: "🔒 Pago seguro procesado por Stripe. Cancela cuando quieras.",
        },
      },
      locale: "es",
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      session_id: session.id,
    });

  } catch (err: any) {
    console.error("[Stripe Checkout] Error fatal:", err);

    if (err.type === "StripeAuthenticationError") {
      return NextResponse.json(
        {
          success: false,
          error: "Error de autenticación con Stripe. Verifica STRIPE_SECRET_KEY.",
          code: "STRIPE_AUTH_ERROR",
        },
        { status: 500 }
      );
    }

    if (err.type === "StripeConnectionError") {
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo conectar con Stripe. Intenta más tarde.",
          code: "STRIPE_CONNECTION_ERROR",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Error interno al crear la sesión de pago",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}