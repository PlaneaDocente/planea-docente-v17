import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// ── Supabase Admin (Service Role) ──
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn("[webhook] SUPABASE_SERVICE_ROLE_KEY no configurado.");
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

// ── Stripe LAZY ──
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.warn("[webhook] STRIPE_SECRET_KEY no configurado.");
    return null;
  }
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  // ── VALIDAR CONFIGURACIÓN ──
  if (!stripe) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin no configurado" }, { status: 503 });
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  // ── VALIDAR FIRMA ──
  if (!signature) {
    console.error("❌ Webhook: Falta firma Stripe-Signature");
    return NextResponse.json({ error: "Falta firma" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ Webhook: STRIPE_WEBHOOK_SECRET no configurada");
    return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`✅ Webhook: Evento recibido - ${event.type} | ID: ${event.id}`);
  } catch (err: any) {
    console.error(`❌ Webhook: Error de firma - ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // ── PROCESAR EVENTO ──
  try {
    switch (event.type) {

      // ════════════════════════════════════════════════════════════
      // CHECKOUT COMPLETADO → Usuario pagó / inició prueba
      // ════════════════════════════════════════════════════════════
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const metadata = session.metadata || {};
        const planId = metadata.plan_id || metadata.planId || "profesional";

        console.log("[webhook] checkout.session.completed:", { userId, customerId, subscriptionId, planId });

        if (!userId || !subscriptionId || !planId) {
          console.error("❌ Webhook: Datos incompletos", { userId, subscriptionId, planId });
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);

        // 1. Actualizar perfil
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_pro: true,
            stripe_customer_id: customerId,
          })
          .eq("id", userId);

        if (profileError) {
          console.error("❌ Webhook: Error actualizando perfil:", profileError.message);
        }

        // 2. Guardar suscripción (SOLO columnas que existen en tu BD)
        // Columnas confirmadas: id, user_id, plan_id, estado, fecha_inicio, fecha_fin, 
        // fecha_prueba_fin, stripe_customer_id, stripe_subscription_id, cancelar_al_periodo_fin, created_at
        const subData: any = {
          user_id: userId,
          plan_id: planId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          estado: "trialing",
          fecha_prueba_fin: trialEnd.toISOString().split("T")[0],
          fecha_fin: trialEnd.toISOString().split("T")[0],
          cancelar_al_periodo_fin: false,
        };

        // Intentar upsert (insertar o actualizar)
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert(subData, { onConflict: "stripe_subscription_id" });

        if (subError) {
          console.error("❌ Webhook: Error guardando suscripción:", subError.message);
          // Si falla por constraint, intentar update
          if (subError.code === "23505" || subError.message.includes("duplicate")) {
            const { error: updateErr } = await supabaseAdmin
              .from("subscriptions")
              .update({
                plan_id: planId,
                stripe_customer_id: customerId,
                estado: "trialing",
                fecha_prueba_fin: trialEnd.toISOString().split("T")[0],
                fecha_fin: trialEnd.toISOString().split("T")[0],
              })
              .eq("stripe_subscription_id", subscriptionId);
            if (updateErr) console.error("❌ Webhook: Update también falló:", updateErr.message);
          }
        } else {
          console.log(`✅ Webhook: Suscripción creada para ${userId} (${planId})`);
        }

        break;
      }

      // ════════════════════════════════════════════════════════════
      // PAGO EXITOSO → Renovación
      // ════════════════════════════════════════════════════════════
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        const customerId = invoice.customer as string;

        if (!subscriptionId) {
          return NextResponse.json({ received: true }, { status: 200 });
        }

        let stripeSubscription;
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        } catch (err: any) {
          console.error("❌ Webhook: Error obteniendo suscripción:", err.message);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const status = stripeSubscription.status;
        const currentPeriodEnd = (stripeSubscription as any).current_period_end as number;

        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            estado: status === "active" ? "active" : status,
            fecha_fin: new Date(currentPeriodEnd * 1000).toISOString().split("T")[0],
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (updateError) {
          console.error("❌ Webhook: Error actualizando suscripción:", updateError.message);
        }

        await supabaseAdmin
          .from("profiles")
          .update({ is_pro: true })
          .eq("stripe_customer_id", customerId);

        console.log(`✅ Webhook: Suscripción ${subscriptionId} → ${status}`);
        break;
      }

      // ════════════════════════════════════════════════════════════
      // SUSCRIPCIÓN ACTUALIZADA
      // ════════════════════════════════════════════════════════════
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const currentPeriodEnd = (subscription as any).current_period_end as number;

        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            estado: status,
            cancelar_al_periodo_fin: cancelAtPeriodEnd,
            fecha_fin: new Date(currentPeriodEnd * 1000).toISOString().split("T")[0],
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (updateError) {
          console.error("❌ Webhook: Error en subscription.updated:", updateError.message);
        }

        if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
          await supabaseAdmin
            .from("profiles")
            .update({ is_pro: false })
            .eq("stripe_customer_id", subscription.customer as string);
          console.log(`⚠️ Webhook: Suscripción ${subscriptionId} cancelada`);
        }

        break;
      }

      // ════════════════════════════════════════════════════════════
      // SUSCRIPCIÓN ELIMINADA
      // ════════════════════════════════════════════════════════════
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from("profiles")
          .update({ is_pro: false })
          .eq("stripe_customer_id", customerId);

        await supabaseAdmin
          .from("subscriptions")
          .update({ estado: "canceled" })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`✅ Webhook: Suscripción cancelada para ${customerId}`);
        break;
      }

      // ════════════════════════════════════════════════════════════
      // PAGO FALLIDO
      // ════════════════════════════════════════════════════════════
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ estado: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
        }
        console.warn(`⚠️ Webhook: Pago fallido para subscription ${subscriptionId}`);
        break;
      }

      default:
        console.log(`ℹ️ Webhook: Evento ${event.type} ignorado`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Webhook: Error general:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}