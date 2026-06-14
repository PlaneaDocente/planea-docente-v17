"use client";

// ================================================================
// LandingAuthGuard.tsx
// RUTA: src/components/landing/LandingAuthGuard.tsx
//
// Si el usuario ya tiene sesión activa y llega a /landing,
// lo redirige automáticamente a /dashboard (no a / que siempre
// redirige de vuelta a /landing causando un bucle infinito).
// ================================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

export default function LandingAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    let redirected = false;

    const doRedirect = () => {
      if (!redirected) {
        redirected = true;
        router.replace("/dashboard"); // ✅ CORREGIDO: era "/" → causaba bucle
      }
    };

    // Verificar sesión existente al cargar /landing
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) doRedirect();
    });

    // Capturar si Google OAuth completa mientras está en /landing
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) doRedirect();
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
