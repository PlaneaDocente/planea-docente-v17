import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el NAVEGADOR (browser/client-side).
 * 
 * MEJORA: Storage robusto que funciona en modo incógnito y normal.
 * Fallback: si localStorage no está disponible, usa solo cookies.
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

// ── Helper: verificar si localStorage está disponible ───────────────────────
function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const test = "__ls_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

// ── Storage personalizado robusto (localStorage + cookies) ─────────────────
const cookieStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;

    // 1. Intentar localStorage primero (más rápido)
    if (isLocalStorageAvailable()) {
      try {
        const localValue = window.localStorage.getItem(key);
        if (localValue) return localValue;
      } catch {
        // localStorage bloqueado, continuar con cookies
      }
    }

    // 2. Fallback a cookie
    try {
      const match = document.cookie.match(
        new RegExp("(^| )" + key.replace(/[-[\]{}()*+?.,\^$|#\s]/g, "\$&") + "=([^;]+)")
      );
      return match ? decodeURIComponent(match[2]) : null;
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;

    // 1. Guardar en localStorage (persistencia principal)
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // localStorage lleno o bloqueado
      }
    }

    // 2. Sincronizar en cookie (para SSR/middleware y modo incógnito)
    try {
      const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=2592000; SameSite=Lax${secureFlag}`;
    } catch {
      // Cookie no se pudo escribir
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === "undefined") return;

    // 1. Borrar de localStorage
    if (isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignorar
      }
    }

    // 2. Borrar cookie
    try {
      document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    } catch {
      // Ignorar
    }
  },
};

/**
 * Cliente Supabase global para el navegador.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: cookieStorage,
    storageKey: "sb-planeadocente-auth-token",
    flowType: "pkce",
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