"use client";

// ================================================================
// LandingAuthGuard.tsx
// RUTA: src/components/landing/LandingAuthGuard.tsx
//
// Propósito: Si el usuario ya tiene sesión activa y llega a /landing,
// lo redirige automáticamente a / (donde MainLayout muestra el dashboard).
// No renderiza nada visible — solo maneja la redirección.
// ================================================================

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

export default function LandingAuthGuard() {
  const router = useRouter();

  useEffect(() => {
    let redirected = false;

    // Verificar sesión existente al cargar /landing
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !redirected) {
        redirected = true;
        // Usuario autenticado → ir al dashboard (MainLayout en /)
        router.replace("/");
      }
    });

    // Escuchar si Google OAuth completa mientras está en /landing
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user && !redirected) {
          redirected = true;
          router.replace("/");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // No renderiza nada — solo lógica de redirección
  return null;
}
