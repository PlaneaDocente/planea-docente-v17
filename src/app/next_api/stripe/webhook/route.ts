import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/integrations/supabase/server";

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: '2025-01-27' as any, 
});

export async function POST(req: Request) {
  const body = await req.text();
  const headersList: any = await headers(); // Añadimos : any para saltar la restricción de tipo
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Falta firma" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // AÑADIMOS "as string" PARA QUE TYPESCRIPT NO MARQUE ERROR ROJO
    event = stripe.webhooks.constructEvent(
      body,
      signature as string, 
      process.env.STRIPE_WEBHOOK_SECRET as string 
    );
  } catch (err: any) {
    console.error(`❌ Error de firma: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Si el evento es undefined, cortamos aquí
  if (!event) {
    return NextResponse.json({ error: "No event object" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const userId = session.client_reference_id;
        console.log(`✅ Pago exitoso detectado para el usuario: ${userId}`);

        if (userId) {
          // Actualizamos la tabla 'profiles' en Supabase
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ 
              is_pro: true, 
              stripe_customer_id: session.customer 
            })
            .eq("id", userId);

          if (error) {
            console.error('❌ Error Supabase al actualizar Pro:', error.message);
          }
        }
        break;

      case "customer.subscription.deleted":
        // Lógica para cuando cancelan la suscripción
        const customerId = session.customer as string;
        await supabaseAdmin
          .from("profiles")
          .update({ is_pro: false })
          .eq("stripe_customer_id", customerId);
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error procesando el webhook:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}