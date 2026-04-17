import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { createSubscription } from "@/lib/supabase-subscriptions";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productName, amount, currency, quantity, interval, planId, userId } = body;

    // Validación de datos
    if (!productName || !amount || !userId) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Usamos la variable exacta que tienes en Vercel
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: "STRIPE_SECRET_KEY no está configurada en Vercel." },
        { status: 500 }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-01-27' as any, 
    });

    // Usamos tu variable NEXT_PUBLIC_STRIPE_URL para las redirecciones
    const baseUrl = process.env.NEXT_PUBLIC_STRIPE_URL || "https://planea-docente-v17-eight.vercel.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: currency || "mxn",
            unit_amount: amount,
            product_data: {
              name: productName,
              description: `Suscripción PlaneaDocente · ${interval === "year" ? "Plan Anual" : "Plan Mensual"}`,
            },
          },
          quantity: quantity || 1,
        },
      ],
      success_url: `${baseUrl}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/suscripcion/cancelado`,
    });

    // Registro en Supabase
    if (userId && planId && session.id) {
      await createSubscription({
        user_id: userId,
        plan_id: planId,
        estado: "trialing",
        metadata: { stripe_session_id: session.id },
      });
    }

    return NextResponse.json({ success: true, data: session });

  } catch (error: any) {
    console.error("Error Stripe Checkout:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}