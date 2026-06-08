// RUTA: src/app/api/stripe/cancel-subscription/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  try {
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: "subscriptionId es requerido" },
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

    // Cancelar al final del período — usuario sigue activo hasta que venza
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({
      success: true,
      message: "Suscripción cancelada. Seguirás activo hasta el final del período.",
    });

  } catch (err: any) {
    console.error("[cancel-subscription] Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Error al cancelar" },
      { status: 500 }
    );
  }
}