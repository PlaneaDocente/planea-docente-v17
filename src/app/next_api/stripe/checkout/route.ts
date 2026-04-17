import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";
import { createSubscription } from "@/lib/supabase-subscriptions";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productName, amount, currency, quantity, interval, planId, userId } = body;

    // 1. Validación de datos
    if (!productName || !amount || !userId) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios (productName, amount o userId)" },
        { status: 400 }
      );
    }

    // 2. Verificación de la llave secreta
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: "STRIPE_SECRET_KEY no está configurada en las variables de Vercel." },
        { status: 500 }
      );
    }

    // 3. Inicialización de Stripe con versión estable
    // Cambiamos '2025-01-27' por una versión reconocida para evitar el error de "Invalid API version"
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-03-25.dahlia' as any, 
    });

    // 4. Definición de la URL base
    // Priorizamos siempre tu dominio real para que no se abra la ventana de Vercel.app
    const baseUrl = process.env.NEXT_PUBLIC_STRIPE_URL || "https://planeadocente.com";

    // 5. Creación de la sesión de Checkout
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

      // Estas URLs aseguran que el usuario regrese a tu .com
      success_url: `${baseUrl}/suscripcion/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/suscripcion/cancelado`,
      // Permitir cupones o pruebas gratis si lo necesitas en el futuro
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: 15, 
      },
    });

    // 6. Registro preventivo en Supabase
    if (userId && planId && session.id) {
      try {
        await createSubscription({
          user_id: userId,
          plan_id: planId,
          estado: "trialing",
          metadata: { stripe_session_id: session.id },
        });
      } catch (dbError) {
        console.error("Error al registrar suscripción en DB:", dbError);
        // Continuamos aunque falle la DB para no interrumpir el flujo de pago
      }
    }

    return NextResponse.json({ success: true, data: session });

  } catch (error: any) {
    console.error("Error Stripe Checkout:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" }, 
      { status: 500 }
    );
  }
}