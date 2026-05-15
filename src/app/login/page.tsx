import { Suspense } from "react";
import LoginPageClient from "@/components/auth/LoginPageClient";

export const metadata = {
  title: "Iniciar Sesión – PlaneaDocente",
  description:
    "Accede a tu cuenta de PlaneaDocente. Gestiona alumnos, asistencia, planeaciones y más con IA.",
  openGraph: {
    title: "Iniciar Sesión – PlaneaDocente",
    description: "Accede a tu panel de maestro en PlaneaDocente.",
    url: "https://planeadocente.com/login",
    siteName: "PlaneaDocente",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Iniciar Sesión – PlaneaDocente",
    description: "Accede a tu panel de maestro en PlaneaDocente.",
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
