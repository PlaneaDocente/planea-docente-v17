import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productName, amount, currency, quantity, interval, planId, userId } = body;

    // ── 1. VALIDACIONES BÁSICAS ─────────────────────────────────────────────
    if (!productName || !amount || !userId || !planId) {
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios: productName, amount, userId, planId" },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
      console.error("❌ Checkout: STRIPE_SECRET_KEY inválida o no configurada");
      return NextResponse.json(
        { success: false, error: "STRIPE_SECRET_KEY no configurada correctamente" },
        { status: 500 }
      );
    }

    // ── 2. VALIDAR PLAN Y PRECIO EN BASE DE DATOS (SEGURIDAD) ───────────────
    // ✅ CORREGIDO: usamos supabaseAdmin (igual que el webhook)
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .eq("activo", true)
      .single();

    if (planError || !plan) {
      console.error("❌ Checkout: Plan no encontrado:", planId, planError);
      return NextResponse.json(
        { success: false, error: "Plan de suscripción no válido o inactivo" },
        { status: 400 }
      );
    }

    // 🔐 Seguridad: comparar precio enviado vs precio real en BD
    const precioReal = plan.precio_centavos;
    const precioEnviado = Number(amount);
    
    if (isNaN(precioEnviado) || Math.abs(precioEnviado - precioReal) > 1) {
      console.error("❌ Checkout: Manipulación de precio detectada", {
        enviado: precioEnviado,
        real: precioReal
      });
      return NextResponse.json(
        { success: false, error: "El precio no coincide con el plan seleccionado" },
        { status: 400 }
      );
    }

    const validInterval = interval === "year" ? "year" : "month";
    if (plan.intervalo && plan.intervalo !== validInterval) {
      return NextResponse.json(
        { success: false, error: "Intervalo no válido para este plan" },
        { status: 400 }
      );
    }

    // ── 3. CREAR SESIÓN DE STRIPE ───────────────────────────────────────────
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-04-22.dahlia',
    });

    const baseUrl = process.env.NEXT_PUBLIC_STRIPE_URL || "https://www.planeadocente.com";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: currency || "mxn",
            unit_amount: precioReal,
            recurring: { interval: validInterval },
            product_data: {
              name: plan.nombre || productName,
              description: `Suscripción PlaneaDocente · ${plan.nombre} · ${validInterval === "year" ? "Plan Anual" : "Plan Mensual"}`,
            },
          },
          quantity: quantity || 1,
        },
      ],
      success_url: `${baseUrl}/?session_id={CHECKOUT_SESSION_ID}&paid=true`,
      cancel_url: `${baseUrl}/?canceled=true`,
      allow_promotion_codes: true,
      subscription_data: {
        trial_period_days: plan.dias_prueba || 15,
        metadata: { userId, planId, interval: validInterval },
      },
      metadata: { userId, planId, interval: validInterval },
    });

    console.log(`✅ Checkout: Sesión creada para usuario ${userId}, plan ${planId}`);
    return NextResponse.json({ success: true, data: session });
    
  } catch (error: any) {
    console.error("❌ Stripe Checkout Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}