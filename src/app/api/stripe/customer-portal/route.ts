import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ success: false, error: "Stripe no configurado" }, { status: 503 });
    }
    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Supabase admin no configurado" }, { status: 503 });
    }

    // ── Autenticar al usuario por su token (no confiar en el cliente) ──
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ success: false, error: "No autorizado" }, { status: 401 });
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ success: false, error: "Token inválido" }, { status: 401 });
    }

    // ── Obtener el customer del PROPIO usuario (server-side) ──
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const customerId = (profile as any)?.stripe_customer_id as string | undefined;
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "No se encontró el cliente de Stripe para tu cuenta." },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.planeadocente.com"}/suscripcion`,
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (err: any) {
    console.error("[customer-portal] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
