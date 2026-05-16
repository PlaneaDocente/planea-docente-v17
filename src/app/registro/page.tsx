import { Suspense } from "react";
import RegisterPageClient from "@/components/auth/RegisterPageClient";

export const metadata = {
  title: "Crear Cuenta Gratis – PlaneaDocente V17 | Prueba 15 días",
  description:
    "Regístrate gratis en PlaneaDocente. 15 días de prueba en el plan Profesional. Sin tarjeta de crédito. Gestiona alumnos, asistencia, planeaciones didácticas y evaluaciones con IA alineadas a la Nueva Escuela Mexicana (NEM).",
  keywords: [
    "PlaneaDocente",
    "registro maestro",
    "cuenta gratis",
    "prueba gratuita",
    "NEM",
    "Nueva Escuela Mexicana",
    "planeación didáctica",
    "gestión escolar",
    "asistencia alumnos",
    "evaluación educativa",
    "herramientas IA maestros",
  ],
  openGraph: {
    title: "Crear Cuenta Gratis – PlaneaDocente V17",
    description:
      "15 días de prueba gratis en el plan Profesional. Sin tarjeta de crédito. Sistema educativo NEM.",
    url: "https://planeadocente.com/registro",
    siteName: "PlaneaDocente",
    locale: "es_MX",
    type: "website",
    images: [
      {
        url: "https://planeadocente.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PlaneaDocente - Registro gratuito para maestros",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Crear Cuenta Gratis – PlaneaDocente V17",
    description: "15 días de prueba gratis. Sin tarjeta de crédito.",
    images: ["https://planeadocente.com/og-image.jpg"],
  },
  alternates: {
    canonical: "https://planeadocente.com/registro",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

function RegisterFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-100 dark:from-violet-950 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-muted mx-auto animate-pulse" />
          <div className="h-6 bg-muted rounded w-3/4 mx-auto animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 mx-auto animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-11 bg-muted rounded-xl animate-pulse" />
          <div className="h-11 bg-muted rounded-xl animate-pulse" />
          <div className="h-11 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Cargando formulario de registro...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterFallback />}>
      <RegisterPageClient />
    </Suspense>
  );
}
