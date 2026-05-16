import { Suspense } from "react";
import LoginPageClient from "@/components/auth/LoginPageClient";

export const metadata = {
  title: "Iniciar Sesión – PlaneaDocente V17 | Sistema Educativo NEM",
  description:
    "Accede a tu cuenta de PlaneaDocente. Gestiona alumnos, asistencia, planeaciones didácticas, evaluaciones y más con herramientas de IA alineadas a la Nueva Escuela Mexicana (NEM).",
  keywords: [
    "PlaneaDocente",
    "login maestro",
    "sistema educativo",
    "NEM",
    "Nueva Escuela Mexicana",
    "planeación didáctica",
    "gestión escolar",
    "asistencia alumnos",
    "evaluación educativa",
  ],
  openGraph: {
    title: "Iniciar Sesión – PlaneaDocente V17",
    description:
      "Accede a tu panel de maestro en PlaneaDocente. Planeación educativa con IA para la NEM.",
    url: "https://planeadocente.com/login",
    siteName: "PlaneaDocente",
    locale: "es_MX",
    type: "website",
    images: [
      {
        url: "https://planeadocente.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PlaneaDocente - Sistema Educativo NEM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Iniciar Sesión – PlaneaDocente V17",
    description: "Accede a tu panel de maestro en PlaneaDocente.",
    images: ["https://planeadocente.com/og-image.jpg"],
  },
  alternates: {
    canonical: "https://planeadocente.com/login",
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

function LoginFallback() {
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
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageClient />
    </Suspense>
  );
}
