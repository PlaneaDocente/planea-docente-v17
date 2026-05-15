import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Leer variables de entorno del servidor
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeUrl = process.env.NEXT_PUBLIC_STRIPE_URL;

  // Determinar si están configuradas (existen y no están vacías)
  const isStripeConfigured = !!(stripeSecretKey && stripeSecretKey.startsWith("sk_"));
  const isWebhookConfigured = !!(stripeWebhookSecret && stripeWebhookSecret.startsWith("whsec_"));
  const isUrlConfigured = !!stripeUrl;

  return NextResponse.json({
    status: "ok",
    message: "Sistema activo - PlaneaDocente V17",
    timestamp: new Date().toISOString(),
    stripe_secret_key: isStripeConfigured ? "configured" : "not_configured",
    stripe_webhook_secret: isWebhookConfigured ? "configured" : "not_configured",
    stripe_url: stripeUrl || "missing",
    environment: process.env.NODE_ENV,
  }, { status: 200 });
}