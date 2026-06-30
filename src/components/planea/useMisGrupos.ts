"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GRUPOS } from "./planeadocente-store";

/**
 * Devuelve los grupos del maestro con este orden de prioridad:
 *  1) Los que definió en Configuración → Mis Grupos (configuracion.grupos)
 *  2) Los grupos distintos de sus alumnos registrados
 *  3) La lista estándar completa (fallback)
 *
 * Así cada maestro ve SOLO sus grupos en todas las secciones, sin tener
 * que seleccionarlos en cada lado.
 */
export function useMisGrupos(): string[] {
  const [grupos, setGrupos] = useState<string[]>([]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) { if (!cancel) setGrupos(GRUPOS); return; }

        // 1) Grupos definidos en el perfil
        try {
          const { data: cfg } = await supabase
            .from("configuracion").select("grupos").eq("user_id", uid).maybeSingle();
          const g = Array.isArray((cfg as { grupos?: string[] } | null)?.grupos)
            ? ((cfg as { grupos?: string[] }).grupos || []).filter(Boolean)
            : [];
          if (g.length > 0) { if (!cancel) setGrupos(g); return; }
        } catch { /* la columna 'grupos' aún no existe: continuar */ }

        // 2) Grupos distintos de los alumnos
        const { data: al } = await supabase
          .from("alumnos").select("grupo").eq("user_id", uid).eq("activo", true);
        const set = Array.from(new Set((al || []).map((a: { grupo?: string }) => (a.grupo || "").trim()).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
        if (set.length > 0) { if (!cancel) setGrupos(set); return; }

        // 3) Fallback
        if (!cancel) setGrupos(GRUPOS);
      } catch {
        if (!cancel) setGrupos(GRUPOS);
      }
    })();
    return () => { cancel = true; };
  }, []);

  return grupos;
}
