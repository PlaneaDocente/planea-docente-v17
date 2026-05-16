import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el NAVEGADOR (browser/client-side).
 *
 * Variables de entorno requeridas en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 *
 * ⚠️ Este cliente se ejecuta SOLO en el navegador.
 *
 * MEJORA CRÍTICA: Sincroniza la sesión tanto en localStorage como en cookies,
 * para que el middleware de Next.js pueda detectar la sesión server-side.
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
if (!supabaseUrl.startsWith("https://")) {
  throw new Error(
    "[supabase/client] NEXT_PUBLIC_SUPABASE_URL debe comenzar con https://"
  );
}

/**
 * Storage personalizado que escribe en localStorage Y en cookies.
 * Esto permite que el middleware de Next.js lea la sesión desde cookies
 * mientras el cliente la mantiene en localStorage.
 */
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    // 1. Intentar localStorage primero (más rápido)
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;
    // 2. Fallback a cookie (para compatibilidad con SSR/middleware)
    const match = document.cookie.match(new RegExp("(^| )" + key.replace(/[-[\]{}()*+?.,\^$|#\s]/g, "\$&") + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    // 1. Guardar en localStorage (persistencia principal)
    localStorage.setItem(key, value);
    // 2. Sincronizar en cookie (para que el middleware la lea)
    //    Max-age: 30 días, SameSite=Lax, Secure solo en HTTPS
    const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax${secureFlag}`;
  },
  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;
    // 1. Borrar de localStorage
    localStorage.removeItem(key);
    // 2. Borrar cookie
    document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
  },
};

/**
 * Cliente Supabase global para el navegador.
 *
 * Configuración:
 * - auth: persistencia en localStorage + cookies (dual storage)
 * - detectSessionInUrl: true (procesa automáticamente ?code= de OAuth)
 * - realtime: reconexión automática
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: cookieStorage,
    storageKey: "sb-planeadocente-auth-token",
    flowType: "pkce", // ⭐ CRÍTICO: PKCE evita el "bounce tracking" de Chrome con OAuth
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
 */
export async function checkSupabaseHealth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase.from("subscription_plans").select("id").limit(1);
    if (error && error.code !== "PGRST116") {
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
