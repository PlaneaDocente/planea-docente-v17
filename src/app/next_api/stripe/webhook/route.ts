import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("❌ WEBHOOK: Falta firma");
    return NextResponse.json({ error: "Falta firma" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
    console.log(`✅ WEBHOOK: Evento recibido - ${event.type}`);
  } catch (err: any) {
    console.error(`❌ WEBHOOK: Error de firma - ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    // --- checkout.session.completed ---
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;

      console.log(`🔍 WEBHOOK checkout.session.completed:`);
      console.log(`   - userId (client_reference_id): ${userId}`);
      console.log(`   - customerId: ${customerId}`);

      if (!userId) {
        console.error("❌ WEBHOOK: No hay userId en client_reference_id");
        return NextResponse.json({ error: "No userId" }, { status: 200 }); // 200 para que Stripe no reintente
      }

      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ 
          is_pro: true, 
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)
        .select(); // <-- Agregamos .select() para ver si actualizó algo

      if (error) {
        console.error("❌ WEBHOOK: Error de Supabase:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        console.error(`❌ WEBHOOK: No se encontró usuario con ID ${userId}`);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      console.log(`✅ WEBHOOK: Usuario ${userId} actualizado a PRO correctamente`);
    }

    // --- customer.subscription.created ---
    else if (event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      console.log(`🔍 WEBHOOK customer.subscription.created:`);
      console.log(`   - customerId: ${customerId}`);

      // Buscamos al usuario por stripe_customer_id (si ya existe de un pago anterior)
      // o lo activamos por si acaso
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .update({ 
          is_pro: true,
          updated_at: new Date().toISOString()
        })
        .eq("stripe_customer_id", customerId)
        .select();

      if (error) {
        console.error("❌ WEBHOOK: Error actualizando por subscription:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        console.log(`⚠️ WEBHOOK: No se encontró usuario con stripe_customer_id ${customerId}`);
        // No es error crítico, puede ser que aún no tengamos el customer guardado
        return NextResponse.json({ received: true }, { status: 200 });
      }

      console.log(`✅ WEBHOOK: Suscripción activada para customer ${customerId}`);
    }

    // --- customer.subscription.deleted ---
    else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      await supabaseAdmin
        .from("profiles")
        .update({ is_pro: false })
        .eq("stripe_customer_id", customerId);

      console.log(`✅ WEBHOOK: Suscripción cancelada para customer ${customerId}`);
    }

    else {
      console.log(`ℹ️ WEBHOOK: Evento ${event.type} ignorado`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("❌ WEBHOOK: Error general:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}