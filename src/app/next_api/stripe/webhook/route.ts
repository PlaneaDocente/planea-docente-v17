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
  // Si tu SDK marca error de tipo con esta apiVersion, quítala (usa el default de la cuenta).
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

// ── Helper: registrar un pago en payment_history (idempotente por stripe_invoice_id) ──
async function registrarPago(
  supabaseAdmin: any,
  args: {
    stripeSubscriptionId: string | null;
    customerId: string | null;
    invoiceId: string | null;
    paymentIntentId: string | null;
    montoCentavos: number;
    moneda: string;
    estado: "succeeded" | "failed" | "pending" | "refunded";
    descripcion?: string;
  }
) {
  // No registrar facturas de $0 (p. ej. el arranque del trial)
  if (!args.montoCentavos || args.montoCentavos <= 0) return;

  // Idempotencia: si ya existe ese invoice, no duplicar
  if (args.invoiceId) {
    const { data: existente } = await supabaseAdmin
      .from("payment_history")
      .select("id")
      .eq("stripe_invoice_id", args.invoiceId)
      .maybeSingle();
    if (existente) return;
  }

  // Resolver user_id y subscription_id (uuid local) a partir de la suscripción de Stripe
  let userId: string | null = null;
  let localSubId: string | null = null;
  if (args.stripeSubscriptionId) {
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, user_id")
      .eq("stripe_subscription_id", args.stripeSubscriptionId)
      .maybeSingle();
    if (sub) {
      localSubId = (sub as any).id;
      userId = (sub as any).user_id;
    }
  }
  // Fallback: resolver user_id por el customer
  if (!userId && args.customerId) {
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", args.customerId)
      .maybeSingle();
    if (prof) userId = (prof as any).id;
  }

  const { error } = await supabaseAdmin.from("payment_history").insert({
    user_id: userId,
    subscription_id: localSubId,
    stripe_payment_intent_id: args.paymentIntentId,
    stripe_invoice_id: args.invoiceId,
    monto_centavos: args.montoCentavos,
    moneda: args.moneda || "mxn",
    estado: args.estado,
    descripcion: args.descripcion || null,
    fecha_pago: new Date().toISOString(),
  });
  if (error) console.error("[webhook] Error registrando pago en payment_history:", error.message);
}

export async function POST(req: Request) {
  const stripe = getStripe();
  const supabaseAdmin = getSupabaseAdmin();

  if (!stripe) {
    return NextResponse.json({ error: "Stripe no configurado" }, { status: 503 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase admin no configurado" }, { status: 503 });
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

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
    console.log(`✅ Webhook: ${event.type} | ID: ${event.id}`);
  } catch (err: any) {
    console.error(`❌ Webhook: Error de firma - ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {

      // ════════════════════════════════════════════════════════════
      // CHECKOUT COMPLETADO → inicia prueba / suscripción
      // ════════════════════════════════════════════════════════════
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const metadata = session.metadata || {};
        const planId = metadata.plan_id || metadata.planId || "profesional";

        if (!userId || !subscriptionId || !planId) {
          console.error("❌ Webhook: Datos incompletos", { userId, subscriptionId, planId });
          return NextResponse.json({ received: true }, { status: 200 });
        }

        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 15);

        // 1) Perfil
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({ is_pro: true, stripe_customer_id: customerId, plan_actual: planId })
          .eq("id", userId);
        if (profileError) console.error("❌ Webhook: perfil:", profileError.message);

        // 2) Suscripción (upsert por stripe_subscription_id)
        const subData: any = {
          user_id: userId,
          plan_id: planId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          estado: "trialing",
          fecha_prueba_fin: trialEnd.toISOString(),
          fecha_fin: trialEnd.toISOString(),
          cancelar_al_periodo_fin: false,
          updated_at: new Date().toISOString(),
        };

        const { error: subError } = await supabaseAdmin
          .from("subscriptions")
          .upsert(subData, { onConflict: "stripe_subscription_id" });
        if (subError) console.error("❌ Webhook: suscripción:", subError.message);
        else console.log(`✅ Webhook: suscripción creada ${userId} (${planId})`);

        break;
      }

      // ════════════════════════════════════════════════════════════
      // PAGO EXITOSO → renovación (y registro en historial)
      // ════════════════════════════════════════════════════════════
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          (invoice as any).subscription ||
          (invoice as any).lines?.data?.[0]?.subscription ||
          null;
        const customerId = invoice.customer as string;

        if (subscriptionId) {
          let stripeSubscription;
          try {
            stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
          } catch (err: any) {
            console.error("❌ Webhook: retrieve subscription:", err.message);
            stripeSubscription = null;
          }

          if (stripeSubscription) {
            const status = stripeSubscription.status;
            // En la API nueva (dahlia) current_period_end vive en el item; fallback a la vieja.
            const currentPeriodEnd = ((stripeSubscription as any).items?.data?.[0]?.current_period_end
              ?? (stripeSubscription as any).current_period_end) as number;

            const { error: updateError } = await supabaseAdmin
              .from("subscriptions")
              .update({
                estado: status === "active" ? "active" : status,
                fecha_fin: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscriptionId);
            if (updateError) console.error("❌ Webhook: update sub:", updateError.message);
          }

          await supabaseAdmin.from("profiles").update({ is_pro: true }).eq("stripe_customer_id", customerId);
        }

        // ✅ NUEVO: registrar el pago en payment_history
        await registrarPago(supabaseAdmin, {
          stripeSubscriptionId: subscriptionId,
          customerId,
          invoiceId: invoice.id ?? null,
          paymentIntentId: (invoice as any).payment_intent ?? null,
          montoCentavos: invoice.amount_paid ?? 0,
          moneda: invoice.currency ?? "mxn",
          estado: "succeeded",
          descripcion: (invoice as any).lines?.data?.[0]?.description ?? "Pago de suscripción",
        });

        console.log(`✅ Webhook: pago registrado para sub ${subscriptionId}`);
        break;
      }

      // ════════════════════════════════════════════════════════════
      // SUSCRIPCIÓN ACTUALIZADA (cambio de plan / cancelación programada)
      // ════════════════════════════════════════════════════════════
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        const currentPeriodEnd = ((subscription as any).items?.data?.[0]?.current_period_end
          ?? (subscription as any).current_period_end) as number;

        // Resolver plan por el price (columnas REALES: stripe_price_id / stripe_price_id_anual)
        let newPlanId: string | null = null;
        if (subscription.items.data.length > 0) {
          const priceId = subscription.items.data[0].price.id;
          const { data: plan } = await supabaseAdmin
            .from("subscription_plans")
            .select("id")
            .or(`stripe_price_id.eq.${priceId},stripe_price_id_anual.eq.${priceId}`)
            .maybeSingle();
          if (plan) newPlanId = (plan as any).id;
        }

        const updateData: any = {
          estado: status,
          cancelar_al_periodo_fin: cancelAtPeriodEnd,
          fecha_fin: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        };
        if (newPlanId) updateData.plan_id = newPlanId;

        const { error: updateError } = await supabaseAdmin
          .from("subscriptions")
          .update(updateData)
          .eq("stripe_subscription_id", subscriptionId);
        if (updateError) console.error("❌ Webhook: subscription.updated:", updateError.message);

        if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
          await supabaseAdmin
            .from("profiles")
            .update({ is_pro: false, plan_actual: null })
            .eq("stripe_customer_id", subscription.customer as string);
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
          .update({ is_pro: false, plan_actual: null })
          .eq("stripe_customer_id", customerId);

        await supabaseAdmin
          .from("subscriptions")
          .update({ estado: "canceled", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`✅ Webhook: suscripción cancelada ${customerId}`);
        break;
      }

      // ════════════════════════════════════════════════════════════
      // PAGO FALLIDO
      // ════════════════════════════════════════════════════════════
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          (invoice as any).subscription ||
          (invoice as any).lines?.data?.[0]?.subscription ||
          null;

        if (subscriptionId) {
          await supabaseAdmin
            .from("subscriptions")
            .update({ estado: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);
        }

        // Registrar el intento fallido en el historial
        await registrarPago(supabaseAdmin, {
          stripeSubscriptionId: subscriptionId,
          customerId: invoice.customer as string,
          invoiceId: invoice.id ?? null,
          paymentIntentId: (invoice as any).payment_intent ?? null,
          montoCentavos: (invoice as any).amount_due ?? 0,
          moneda: invoice.currency ?? "mxn",
          estado: "failed",
          descripcion: "Pago fallido",
        });

        console.warn(`⚠️ Webhook: pago fallido sub ${subscriptionId}`);
        break;
      }

      default:
        console.log(`ℹ️ Webhook: evento ${event.type} ignorado`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("❌ Webhook: error general:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
