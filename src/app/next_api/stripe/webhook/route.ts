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
    return NextResponse.json({ error: "Falta firma" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error(`❌ Error de firma: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as any;

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "customer.subscription.created":
      case "invoice.payment_succeeded": // Refuerzo para pagos exitosos
        const userId = session.client_reference_id || session.metadata?.userId;
        console.log(`✅ Activando PRO para usuario: ${userId}`);

        if (userId) {
          const { error } = await supabaseAdmin
            .from("profiles")
            .update({ 
              is_pro: true, 
              stripe_customer_id: session.customer,
              updated_at: new Date().toISOString()
            })
            .eq("id", userId);

          if (error) console.error('❌ Error Supabase:', error.message);
          else console.log('✅ Usuario actualizado a PRO');
        }
        break;

      case "customer.subscription.deleted":
        const customerId = session.customer as string;
        await supabaseAdmin
          .from("profiles")
          .update({ is_pro: false })
          .eq("stripe_customer_id", customerId);
        break;

      default:
        console.log(`Evento ignorado: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error en webhook:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}