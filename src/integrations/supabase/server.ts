import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase ADMIN para el SERVIDOR (Server Components, API Routes, Webhooks).
 *
 * Variables de entorno requeridas en .env.local (NO en el frontend):
 *   SUPABASE_URL=https://tu-proyecto.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * ⚠️ SEGURIDAD CRÍTICA:
 * - La SERVICE_ROLE_KEY tiene poder TOTAL sobre la base de datos.
 * - Bypassa Row Level Security (RLS).
 * - NUNCA expongas esta clave al frontend ni la commitees en el repo.
 * - En Vercel, configúrala como variable de entorno ENCRIPTADA.
 *
 * Usos permitidos:
 *   ✓ API Routes (Route Handlers)
 *   ✓ Server Components (async)
 *   ✓ Webhooks de Stripe (para actualizar suscripciones)
 *   ✓ Scripts de seeding/migración
 *
 * Usos PROHIBIDOS:
 *   ✗ Client Components (React "use client")
 *   ✗ Código enviado al navegador
 *   ✗ LocalStorage, sessionStorage
 */

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Validación estricta ────────────────────────────────────────────────────
if (!supabaseUrl) {
  throw new Error(
    "[supabase/server] SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) no está definida. " +
    "Agrega la URL de tu proyecto de Supabase en .env.local"
  );
}
if (!serviceRoleKey) {
  throw new Error(
    "[supabase/server] SUPABASE_SERVICE_ROLE_KEY no está definida. " +
    "Esta clave es obligatoria para operaciones de servidor. " +
    "Encuéntrala en: Supabase Dashboard → Project Settings → API → service_role key"
  );
}

if (!supabaseUrl.startsWith("https://")) {
  throw new Error(
    "[supabase/server] SUPABASE_URL debe comenzar con https://"
  );
}

if (!serviceRoleKey.startsWith("eyJ")) {
  throw new Error(
    "[supabase/server] SUPABASE_SERVICE_ROLE_KEY parece inválida. " +
    "Debe ser un JWT que comience con 'eyJ'."
  );
}

/**
 * Cliente Supabase Admin con privilegios elevados.
 *
 * Este cliente bypassa RLS. Úsalo con precaución:
 * - Solo en contextos de servidor donde ya validaste autenticación.
 * - Nunca para operaciones directas del usuario sin verificación.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "x-application-name": "planeadocente-server",
    },
  },
});

/**
 * Helper para ejecutar operaciones admin con manejo de errores tipado.
 *
 * Ejemplo:
 *   const result = await adminQuery(async (client) => {
 *     return client.from("subscriptions").select("*").eq("user_id", uid);
 *   });
 */
export async function adminQuery<T>(
  operation: (client: typeof supabaseAdmin) => Promise<{ data: T | null; error: Error | null }>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const { data, error } = await operation(supabaseAdmin);
    if (error) {
      console.error("[supabase/server] Admin query error:", error);
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido en adminQuery";
    console.error("[supabase/server] Admin query exception:", msg);
    return { data: null, error: msg };
  }
}
