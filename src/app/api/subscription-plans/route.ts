import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = admin || createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: plans, error } = await client
      .from("subscription_plans")
      .select("*")
      .eq("activo", true)
      .order("orden", { ascending: true });

    if (error) {
      console.error("[API/subscription-plans] Error:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Si no hay planes en BD, devolver fallback para que la UI no se rompa
    if (!plans || plans.length === 0) {
      const fallback = [
        {
          id: "basico",
          nombre: "Básico",
          precio_centavos: 9900,
          precio_centavos_anual: 99000,
          moneda: "mxn",
          intervalo: "month",
          dias_prueba: 15,
          descripcion: "Ideal para maestros que inician",
          caracteristicas: ["Hasta 35 alumnos", "Registro de asistencia", "Planeaciones básicas", "Reportes simples"],
          activo: true,
          orden: 1,
        },
        {
          id: "profesional",
          nombre: "Profesional",
          precio_centavos: 19900,
          precio_centavos_anual: 199000,
          moneda: "mxn",
          intervalo: "month",
          dias_prueba: 15,
          descripcion: "Para maestros avanzados",
          caracteristicas: ["Alumnos ilimitados", "Herramientas IA", "Generación de imágenes", "Planeaciones IA", "Reportes avanzados"],
          activo: true,
          orden: 2,
        },
        {
          id: "institucional",
          nombre: "Institucional",
          precio_centavos: 49900,
          precio_centavos_anual: 499000,
          moneda: "mxn",
          intervalo: "month",
          dias_prueba: 15,
          descripcion: "Para escuelas",
          caracteristicas: ["Múltiples maestros", "Panel de director", "Reportes institucionales", "Soporte 24/7"],
          activo: true,
          orden: 3,
        },
      ];
      return NextResponse.json({ success: true, data: fallback, source: "fallback" });
    }

    return NextResponse.json({ success: true, data: plans, source: "database" });
  } catch (err: any) {
    console.error("[API/subscription-plans] Error:", err?.message);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}