import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el NAVEGADOR (browser/client-side).
 *
 * Variables de entorno requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 * ⚠️ Este cliente se ejecuta SOLO en el navegador. No uses en Server Components
 * ni en API Routes (usa server.ts para eso).
 *
 * El cliente incluye auth, realtime, storage y database.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Validación estricta de variables de entorno ────────────────────────────
if (!supabaseUrl) {
  throw new Error(
    "[supabase/client] NEXT_PUBLIC_SUPABASE_URL no está definida. " +
    "Agrega la URL de tu proyecto de Supabase en .env.local"
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    "[supabase/client] NEXT_PUBLIC_SUPABASE_ANON_KEY no está definida. " +
    "Agrega la clave anónima de Supabase en .env.local"
  );
}

// Validación básica de formato de URL
if (!supabaseUrl.startsWith("https://")) {
  throw new Error(
    "[supabase/client] NEXT_PUBLIC_SUPABASE_URL debe comenzar con https://"
  );
}

/**
 * Cliente Supabase global para el navegador.
 *
 * Configuración:
 * - auth: persistencia en localStorage (sesión se mantiene entre recargas)
 * - realtime: reconexión automática
 * - db: sin schema explícito (usa "public" por defecto)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "sb-planeadocente-auth-token",
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      "x-application-name": "planeadocente-web",
    },
  },
});

/**
 * Helper para verificar la conectividad con Supabase.
 * Útil para diagnosticar problemas de red o configuración.
 */
export async function checkSupabaseHealth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.from("subscription_plans").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
      // PGRST116 = tabla no existe (aceptable si aún no hay tablas)
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de conexión desconocido",
    };
  }
}
