// RUTA: src/app/landing/page.tsx
// Sin LandingAuthGuard — causaba bucle porque / siempre redirige a /landing

import LandingPageClient from "@/components/landing/LandingPageClient";

export const metadata = {
  title: "PlaneaDocente – La plataforma educativa #1 para maestros mexicanos",
  description:
    "Genera planeaciones con IA, controla asistencia, evalúa y comunícate con padres. Prueba gratis 15 días.",
};

export default function LandingPage() {
  return <LandingPageClient />;
}
