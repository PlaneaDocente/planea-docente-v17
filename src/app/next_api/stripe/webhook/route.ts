import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  // ── 1. VALIDAR FIRMA ──────────────────────────────────────────────────────
  if (!signature) {
    console.error("❌ Webhook: Falta firma Stripe-Signature");
    return NextResponse.json({ error: "Falta firma" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSecret.startsWith("whsec_")) {
    console.error("❌ Webhook: STRIPE_WEBHOOK_SECRET no configurada correctamente");
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

  // ── 2. PROCESAR EVENTO ────────────────────────────────────────────────────
  try {
    switch (event.type) {
      
      // ═══════════════════════════════════════════════════════════════════════
      // CHECKOUT COMPLETADO → Usuario pagó / inició prueba
      // ═══════════════════════════════════════════════════════════════════════
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const metadata = session.metadata || {};
        const { planId, interval } = metadata;

        if (!userId || !subscriptionId || !planId) {
          console.error("❌ Webhook: Datos incompletos en checkout.session.completed", {
            userId, subscriptionId, planId, sessionId: session.id
          });
          // Devolvemos 200 para que Stripe no reintente (el problema no se soluciona reintentando)
          return NextResponse.json({ error: "Missing data" }, { status: 200 });
        }

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);

        // 2.1 Actualizar perfil del usuario
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            is_pro: true,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (profileError) {
          console.error("❌ Webhook: Error actualizando perfil:", profileError.message);
          // No devolvemos error a Stripe para evitar reintentos infinitos
        }

        // 2.2 Guardar/actualizar suscripción
        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan_id: planId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              estado: "trialing",
              fecha_prueba_fin: trialEnd.toISOString(),
              fecha_fin: trialEnd.toISOString(),
              cancelar_al_periodo_fin: false,
              creado_en: new Date().toISOString(),
              actualizado_en: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" }
          );

        if (subError) {
          console.error("❌ Webhook: Error guardando suscripción:", subError.message);
        } else {
          console.log(`✅ Webhook: Usuario ${userId} (${planId}) en prueba hasta ${trialEnd.toISOString()}`);
        }

        // 2.3 LÓGICA DE AFILIADOS (con manejo seguro de null)
        try {
          const customerEmail = session.customer_details?.email || session.customer_email;
          
          if (customerEmail) {
            const { data: referral } = await supabaseAdmin
              .from('affiliate_referrals')
              .select('affiliate_id')
              .eq('email_referido', customerEmail)
              .eq('estado', 'registrado')
              .maybeSingle();

            if (referral) {
              // Marcar como suscrito
              await supabaseAdmin
                .from('affiliate_referrals')
                .update({ 
                  estado: 'suscrito', 
                  fecha_conversion: new Date().toISOString() 
                })
                .eq('email_referido', customerEmail);

              // Calcular comisión (20% del monto total)
              const amountTotal = session.amount_total || 0;
              const commissionCents = Math.round(amountTotal * 0.2);

              // Actualizar estadísticas del afiliado
              const { error: rpcError } = await supabaseAdmin.rpc('increment_affiliate_stats', {
                p_affiliate_id: referral.affiliate_id,
                p_commission_cents: commissionCents
              });

              if (rpcError) {
                console.error("❌ Webhook: Error actualizando estadísticas de afiliado:", rpcError);
              } else {
                console.log(`✅ Webhook: Comisión acreditada: ${commissionCents} centavos para afiliado ${referral.affiliate_id}`);
              }
            } else {
              console.log(`ℹ️ Webhook: No hay referido registrado para ${customerEmail}`);
            }
          } else {
            console.log(`ℹ️ Webhook: No se encontró email del cliente en session`);
          }
        } catch (affError: any) {
          // Si falla la lógica de afiliados, NO afecta la suscripción principal
          console.error("❌ Webhook: Error en lógica de afiliados (no crítico):", affError.message);
        }

        break;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PAGO EXITOSO → Renovación o primer pago post-trial
      // ═══════════════════════════════════════════════════════════════════════
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        const customerId = invoice.customer as string;

        if (!subscriptionId) {
          console.log("ℹ️ Webhook: invoice.payment_succeeded sin subscription (pago único)");
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Obtener suscripción actual en Stripe
        let stripeSubscription;
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        } catch (err: any) {
          console.error("❌ Webhook: Error obteniendo suscripción de Stripe:", err.message);
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const status = stripeSubscription.status;
        const currentPeriodEnd = (stripeSubscription as any).current_period_end as number;

        // Actualizar estado: si era trialing y ahora es active, se actualiza
        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update({
            estado: status === "active" ? "active" : status,
            fecha_fin: new Date(currentPeriodEnd * 1000).toISOString(),
            actualizado_en: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (updateError) {
          console.error("❌ Webhook: Error actualizando suscripción:", updateError.message);
        }

        // Asegurar que el usuario sigue siendo PRO
        await supabaseAdmin
          .from("profiles")
          .update({ is_pro: true })
          .eq("stripe_customer_id", customerId);

        console.log(`✅ Webhook: Suscripción ${subscriptionId} actualizada a ${status}`);
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // SUSCRIPCIÓN ACTUALIZADA → Cambio de plan, cancelación programada, etc.
      // ═══════════════════════════════════════════════════════════════════════
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
            fecha_fin: new Date(currentPeriodEnd * 1000).toISOString(),
            actualizado_en: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        if (updateError) {
          console.error("❌ Webhook: Error en subscription.updated:", updateError.message);
        }

        // Si la suscripción se cancela o queda impaga, quitar PRO
        if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
          await supabaseAdmin
            .from("profiles")
            .update({ is_pro: false })
            .eq("stripe_customer_id", subscription.customer as string);
          
          console.log(`⚠️ Webhook: Suscripción ${subscriptionId} cancelada/impaga. is_pro = false`);
        }

        break;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // SUSCRIPCIÓN ELIMINADA → Cancelación inmediata
      // ═══════════════════════════════════════════════════════════════════════
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from("profiles")
          .update({ is_pro: false })
          .eq("stripe_customer_id", customerId);

        await supabaseAdmin
          .from("subscriptions")
          .update({ 
            estado: "canceled", 
            actualizado_en: new Date().toISOString() 
          })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`✅ Webhook: Suscripción cancelada para customer ${customerId}`);
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // PAGO FALLIDO → Marcar como past_due
      // ═══════════════════════════════════════════════════════════════════════
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        console.warn(`⚠️ Webhook: Pago fallido para customer ${customerId}`);

        const subscriptionId = (invoice as any).subscription as string;
        if (subscriptionId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ 
              estado: "past_due", 
              actualizado_en: new Date().toISOString() 
            })
            .eq("stripe_subscription_id", subscriptionId);
        }
        break;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // EVENTOS IGNORADOS
      // ═══════════════════════════════════════════════════════════════════════
      default:
        console.log(`ℹ️ Webhook: Evento ${event.type} ignorado (no requiere acción)`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Webhook: Error general procesando evento:", error);
    // Devolvemos 500 solo si es un error inesperado nuestro
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}