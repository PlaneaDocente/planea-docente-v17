import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de PlaneaDocente V17
 *
 * RESPONSABILIDAD ÚNICA: Agregar headers de seguridad HTTP.
 *
 * ✅ La autenticación de rutas se maneja en el CLIENTE:
 *    - DashboardPage: getSession() + onAuthStateChange (espera 3s)
 *    - LoginPageClient: detecta sesión y redirige a /dashboard
 *    - AuthCallbackClient: procesa OAuth y redirige según suscripción
 *
 * ❌ NO hacer auth en middleware porque:
 *    - Supabase guarda la sesión en localStorage (no accesible en servidor)
 *    - Las cookies se sincronizan async → el middleware las lee antes de que
 *      estén disponibles → redirect falso a /login → loop infinito
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ── Headers de seguridad HTTP ──────────────────────────────────────────────
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)"
  );

  // ── Content Security Policy ─────────────────────────────────────────────────
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob: https://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://accounts.google.com https://apis.google.com https://api.groq.com https://api-inference.huggingface.co https://image.pollinations.ai",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://docs.google.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ")
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplicar a todas las rutas EXCEPTO:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon y assets públicos
     */
    "/((?!_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|icon-192x192.png|icon-512x512.png|og-image.jpg|site.webmanifest).*)",
  ],
};
