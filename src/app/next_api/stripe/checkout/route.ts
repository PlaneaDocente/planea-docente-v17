import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// ─── STRIPE CLIENT ───
// NOTA: Si tu paquete stripe tiene una apiVersion tipada específica,
// usa esa o quita apiVersion para que Stripe use la última automáticamente.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil" as any,
});

// ─── SUPABASE ADMIN CLIENT ───
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

/**
 * POST /next_api/stripe/checkout
 * Crea una sesión de Stripe Checkout con validación completa.
 * 
 * Payload esperado: { price_id, user_id, billing, plan_id }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Detectar y normalizar payload ────────────────────────────────────
    let priceId: string | null = null;
    let userId: string | null = null;
    let planId: string | null = null;
    let billing: "month" | "year" = "month";

    if (body.price_id) {
      priceId = body.price_id;
      userId = body.user_id ?? body.userId ?? null;
      planId = body.plan_id ?? body.planId ?? null;
      billing = body.billing === "year" || body.billing === "annual" ? "year" : "month";
    } else if (body.amount || body.productName) {
      return NextResponse.json(
        {
          success: false,
          error: "Formato obsoleto. El frontend debe enviar price_id (ID de precio de Stripe).",
          code: "LEGACY_FORMAT",
        },
        { status: 400 }
      );
    }

    // ── VALIDACIONES ─────────────────────────────────────────────────────
    if (!priceId || typeof priceId !== "string" || !priceId.startsWith("price_")) {
      return NextResponse.json(
        {
          success: false,
          error: "El price_id es inválido o no está configurado para este plan.",
          code: "INVALID_PRICE_ID",
          detail: "Ve a Stripe Dashboard → Products, crea precios, y copia los price_... IDs a la tabla subscription_plans en Supabase.",
        },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "user_id es requerido", code: "MISSING_USER_ID" },
        { status: 400 }
      );
    }

    // ── VERIFICAR QUE EL PRICE_ID EXISTE EN STRIPE ────────────────────────
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

    // ── OBTENER DATOS DEL USUARIO DESDE SUPABASE ──────────────────────────
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, avatar_url")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[Checkout] Perfil no encontrado:", profileError);
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado en la base de datos", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── CREAR O RECUPERAR CUSTOMER EN STRIPE ──────────────────────────────
    let customerId: string | undefined = undefined;

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .not("stripe_customer_id", "is", null)
      .maybeSingle();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || undefined,
        metadata: { user_id: userId, plan_id: planId || "" },
      });
      customerId = customer.id;

      // Guardar customer_id para futuras referencias
      await supabaseAdmin
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", userId);
    }

    // ── CONSTRUIR URLS ────────────────────────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://planeadocente.com";

    // ── CREAR SESIÓN DE CHECKOUT ─────────────────────────────────────────
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
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_id: planId || "",
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
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      session_id: session.id,
    });

  } catch (err: any) {
    console.error("[Stripe Checkout] Error:", err);

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