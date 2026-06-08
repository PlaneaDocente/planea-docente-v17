// ================================================================
// page.tsx — RUTA: src/app/landing/page.tsx
//
// CAMBIO: Agrega LandingAuthGuard para redirigir usuarios
// autenticados directamente al dashboard sin mostrarse la landing.
// ================================================================

import LandingPageClient from "@/components/landing/LandingPageClient";
import LandingAuthGuard  from "@/components/landing/LandingAuthGuard";

export const metadata = {
  title: "PlaneaDocente – La plataforma educativa #1 para maestros mexicanos",
  description:
    "Genera planeaciones con IA, controla asistencia, evalúa y comunícate con padres. Prueba gratis 15 días.",
};

export default function LandingPage() {
  return (
    <>
      {/* Guard invisible: redirige a / si el usuario ya tiene sesión */}
      <LandingAuthGuard />

      {/* Página normal de landing para usuarios no autenticados */}
      <LandingPageClient />
    </>
  );
}
