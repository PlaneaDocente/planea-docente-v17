import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import GlobalClientEffects from "@/components/GlobalClientEffects";
import PwaRegister from "./pwa-register";
import { AppStoreProvider } from "@/store/app-store";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PlaneaDocente - Sistema Educativo con IA",
    template: "%s – PlaneaDocente",
  },
  description:
    "La plataforma educativa más completa para maestros mexicanos. Genera planeaciones NEM, controla asistencia, evalúa alumnos y comunícate con padres, todo con IA.",
  keywords: [
    "planeaciones",
    "educación",
    "maestros",
    "NEM",
    "Nueva Escuela Mexicana",
    "asistencia",
    "calificaciones",
    "IA educativa",
    "planea docente",
  ],
  authors: [{ name: "PlaneaDocente" }],
  creator: "PlaneaDocente",
  metadataBase: new URL("https://planeadocente.com"),
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://planeadocente.com",
    siteName: "PlaneaDocente",
    title: "PlaneaDocente - Sistema Educativo con IA",
    description:
      "La plataforma educativa más completa para maestros mexicanos.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PlaneaDocente - Plataforma educativa para maestros",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PlaneaDocente - Sistema Educativo con IA",
    description: "La plataforma educativa más completa para maestros mexicanos.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://planeadocente.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppStoreProvider>
          <Toaster position="top-center" richColors closeButton />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <GlobalClientEffects />
            <PwaRegister />
          </ThemeProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
