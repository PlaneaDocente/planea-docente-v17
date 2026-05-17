import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

/**
 * POST /next_api/stripe/checkout
 * Crea una sesión de Stripe Checkout.
 *
 * Acepta DOS formatos de payload para compatibilidad:
 * 1. Estándar Stripe (recomendado): { price_id, user_id, billing, plan_id }
 * 2. Legacy: { productName, amount, userId, planId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Detectar formato y normalizar ──────────────────────────────────────
    let priceId: string | null = null;
    let userId: string | null = null;
    let planId: string | null = null;
    let billing: "month" | "year" = "month";

    // Formato 1: Estándar Stripe (price_id)
    if (body.price_id) {
      priceId = body.price_id;
      userId = body.user_id ?? body.userId ?? null;
      planId = body.plan_id ?? body.planId ?? null;
      billing = body.billing === "year" ? "year" : "month";
    }
    // Formato 2: Legacy (amount + productName)
    else if (body.amount && body.userId) {
      // Crear un price_id temporal o buscar uno existente
      // Este es un fallback para compatibilidad con versiones antiguas
      return NextResponse.json(
        {
          success: false,
          error: "Formato legacy no soportado. Use price_id en lugar de amount.",
        },
        { status: 400 }
      );
    }
    // Formato 3: SuscripcionSection.tsx viejo (amount + userId + planId)
    else if (body.amount && body.userId && body.planId) {
      return NextResponse.json(
        {
          success: false,
          error: "Formato obsoleto. Actualice el frontend para enviar price_id.",
        },
        { status: 400 }
      );
    }

    // ── Validaciones ─────────────────────────────────────────────────────
    if (!priceId) {
      return NextResponse.json(
        { success: false, error: "price_id es requerido" },
        { status: 400 }
      );
    }
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "user_id es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el price_id existe en Stripe
    try {
      await stripe.prices.retrieve(priceId);
    } catch {
      return NextResponse.json(
        { success: false, error: "El price_id no es válido en Stripe. Verifica tu configuración." },
        { status: 400 }
      );
    }

    // ── Crear sesión de checkout ─────────────────────────────────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://planeadocente.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/suscripcion/cancelado`,
      client_reference_id: userId,
      metadata: {
        user_id: userId,
        plan_id: planId ?? "",
        billing,
      },
      subscription_data: {
        metadata: {
          user_id: userId,
          plan_id: planId ?? "",
        },
        trial_period_days: 15, // Prueba gratuita de 15 días
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      session_id: session.id,
    });
  } catch (err: any) {
    console.error("[Stripe Checkout] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Error interno al crear la sesión de pago",
      },
      { status: 500 }
    );
  }
}
