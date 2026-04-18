import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { createSubscription } from "@/lib/supabase-subscriptions";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productName, amount, currency, quantity, interval, planId, userId } = body;

    if (!productName || !amount || !userId) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: "STRIPE_SECRET_KEY no configurada" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16' as any,
    });

    // DOMINIO OFICIAL ÚNICO - Sin espacios, sin barra al final
    const baseUrl = "https://www.planeadocente.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: currency || "mxn",
            unit_amount: amount,
            recurring: {
              interval: interval === "year" ? "year" : "month",
            },
            product_data: {
              name: productName,
              description: `Suscripción PlaneaDocente · ${interval === "year" ? "Plan Anual" : "Plan Mensual"}`,
            },
          },
          quantity: quantity || 1,
        },
      ],
      // Regresamos al menú principal, NO a /dashboard (que no existe)
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&paid=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 15,
      },
    });

    return NextResponse.json({ success: true, data: session });

  } catch (error: any) {
    console.error("Error Stripe Checkout:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}