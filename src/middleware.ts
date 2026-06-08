import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de seguridad y protección de rutas para PlaneaDocente V17.
 *
 * Responsabilidades:
 * 1. Agregar headers de seguridad en TODAS las respuestas.
 * 2. Verificar sesión de Supabase en rutas protegidas (detección robusta de cookies).
 * 3. Redirigir usuarios no autenticados a /login.
 * 4. Permitir acceso libre a webhooks de Stripe, assets estáticos, API públicas y auth callbacks.
 */

// ── Rutas públicas (no requieren autenticación) ────────────────────────────
const PUBLIC_ROUTES = [
  "/",                        // Landing / home
  "/login",                   // Login
  "/registro",                // Registro
  "/landing",                 // Página de aterrizaje
  "/suscripcion",             // Página de planes (venta)
  "/suscripcion/cancelado",   // Cancelación de pago
  "/suscripcion/exito",       // Éxito post-pago
  "/success",                 // Compatibilidad redirección Stripe antigua
  "/auth/callback",           // ⭐ CRÍTICO: Callback OAuth de Supabase
  "/auth/confirm",            // ⭐ CRÍTICO: Confirmación de email de Supabase
  "/api",                     // Rutas API públicas
  "/next_api",                // Rutas API internas (webhooks Stripe)
  "/_next",                   // Assets de Next.js
  "/favicon",                 // Favicon
  "/images",                  // Imágenes públicas
  "/fonts",                   // Fuentes
  "/site.webmanifest",        // PWA manifest
];

// ── Rutas que requieren autenticación + suscripción activa ────────────────
const PROTECTED_ROUTES = [
  "/dashboard",
  "/alumnos",
  "/asistencia",
  "/planeacion",
  "/actividades",
  "/evaluaciones",
  "/evidencias",
  "/reportes",
  "/padres",
  "/configuracion",
  "/descargas",
  "/herramientas-ia",
  "/afiliados",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function requiresSubscription(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Extrae el token de sesión de Supabase desde las cookies.
 * El cliente de browser guarda la sesión con storageKey: "sb-planeadocente-auth-token"
 * y también sincroniza cookies con el mismo nombre.
 *
 * Además busca cookies estándar de Supabase por si migra a @supabase/ssr en el futuro.
 */
function getSessionTokenFromCookies(request: NextRequest): string | null {
  const cookies = request.cookies;

  // 1. Cookie del cliente custom (sb-planeadocente-auth-token)
  const customToken = cookies.get("sb-planeadocente-auth-token");
  if (customToken?.value) return customToken.value;

  // 2. Cookies estándar de Supabase JS v2
  const accessToken = cookies.get("sb-access-token");
  if (accessToken?.value) return accessToken.value;

  const refreshToken = cookies.get("sb-refresh-token");
  if (refreshToken?.value) return refreshToken.value;

  // 3. Cookie legacy de Supabase
  const legacyToken = cookies.get("supabase-auth-token");
  if (legacyToken?.value) return legacyToken.value;

  // 4. Fallback: buscar cualquier cookie que empiece con "sb-" y contenga "token"
  for (const [name, cookie] of cookies) {
    if (name.startsWith("sb-") && name.includes("token")) {
      return cookie.value;
    }
  }

  return null;
}

/**
 * Headers de seguridad recomendados para producción.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://accounts.google.com https://api.groq.com https://api-inference.huggingface.co",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com https://docs.google.com",
      "frame-ancestors 'self'",
    ].join("; ")
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), accelerometer=()"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Siempre agregar headers de seguridad
  const response = NextResponse.next();
  addSecurityHeaders(response);

  // 2. Rutas públicas: permitir sin verificación
  if (isPublicRoute(pathname)) {
    return response;
  }

  // 3. Verificar sesión de autenticación
  const sessionToken = getSessionTokenFromCookies(request);

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Rutas protegidas: el usuario tiene token, permitir paso.
  //    La verificación de suscripción activa se hace en el frontend (AuthGate)
  //    para evitar latencia extra en cada request del middleware.
  if (requiresSubscription(pathname)) {
    // Token presente = autenticado. El frontend se encarga del resto.
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|next_api/|_next/static|_next/image|favicon.ico|site.webmanifest|images/|fonts/).*)",
  ],
};
