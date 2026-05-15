import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware de seguridad y protección de rutas para PlaneaDocente.
 *
 * Responsabilidades:
 * 1. Agregar headers de seguridad en TODAS las respuestas.
 * 2. Verificar sesión de Supabase en rutas protegidas.
 * 3. Redirigir usuarios no autenticados a /login.
 * 4. Redirigir usuarios sin suscripción activa a /suscripcion.
 * 5. Permitir acceso libre a webhooks de Stripe, assets estáticos y API públicas.
 *
 * ⚠️ Este middleware usa cookies directamente (patrón manual) para evitar
 * dependencia de @supabase/ssr. Si tienes @supabase/ssr instalado, se puede
 * migrar a createMiddlewareClient para validación más robusta de JWT.
 */

// ── Rutas públicas (no requieren autenticación) ────────────────────────────
const PUBLIC_ROUTES = [
  "/",                    // Landing / home
  "/login",               // Login
  "/registro",            // Registro
  "/landing",             // Página de aterrizaje
  "/suscripcion",         // Página de planes (venta)
  "/suscripcion/cancelado", // Cancelación de pago
  "/success",             // Compatibilidad con redirección Stripe antigua
  "/api",                 // Rutas API públicas
  "/next_api",            // Rutas API internas (incluye webhooks Stripe)
  "/_next",               // Assets de Next.js
  "/favicon",             // Favicon
  "/images",              // Imágenes públicas
  "/fonts",               // Fuentes
];

// ── Rutas que requieren autenticación pero NO suscripción activa ────────────
const AUTH_ONLY_ROUTES = [
  "/login",
  "/registro",
  "/suscripcion",
  "/suscripcion/cancelado",
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
  "/suscripcion/exito",   // Éxito post-pago requiere sesión para verificar
];

/**
 * Verifica si una ruta es pública (no requiere auth).
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Verifica si una ruta requiere suscripción activa.
 */
function requiresSubscription(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Extrae el token de sesión de Supabase desde las cookies.
 * Supabase guarda el token en cookies como sb-<project-ref>-auth-token.
 */
function getSessionTokenFromCookies(request: NextRequest): string | null {
  const cookies = request.cookies;
  // Buscar cookie de Supabase Auth (patrón: sb-.*-auth-token)
  for (const [name, cookie] of cookies) {
    if (name.includes("auth-token") || name.startsWith("sb-")) {
      return cookie.value;
    }
  }
  return null;
}

/**
 * Headers de seguridad recomendados para producción.
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevenir clickjacking: solo tu dominio puede embeber la app
  response.headers.set("X-Frame-Options", "SAMEORIGIN");

  // CSP restrictivo para iframes (propio dominio únicamente)
  response.headers.set(
    "Content-Security-Policy",
    "frame-ancestors 'self'; default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com;"
  );

  // Prevenir MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Política de referrer
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Política de permisos (cámara, micrófono, geolocalización)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // HSTS (solo en producción con HTTPS)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Siempre agregar headers de seguridad ────────────────────────────────
  const response = NextResponse.next();
  addSecurityHeaders(response);

  // ── 2. Rutas públicas: permitir sin verificación ───────────────────────────
  if (isPublicRoute(pathname)) {
    return response;
  }

  // ── 3. Verificar sesión de autenticación ───────────────────────────────────
  const sessionToken = getSessionTokenFromCookies(request);

  if (!sessionToken) {
    // No hay sesión: redirigir a login preservando la URL destino
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Rutas que requieren suscripción activa ──────────────────────────────
  if (requiresSubscription(pathname)) {
    // Nota: En una versión futura con @supabase/ssr, aquí se verificaría
    // la suscripción del usuario consultando Supabase o un JWT claim.
    // Por ahora, el frontend (useAppStore) se encarga de la verificación
    // secundaria mostrando banners de upgrade si no hay plan activo.
    //
    // Para activar verificación server-side, descomenta el bloque siguiente
    // y asegúrate de tener @supabase/ssr instalado:
    /*
    const supabase = createMiddlewareClient({ req: request, res: response });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Verificar suscripción en DB
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("estado")
      .eq("user_id", session.user.id)
      .in("estado", ["active", "trialing"])
      .maybeSingle();
    if (!sub) {
      return NextResponse.redirect(new URL("/suscripcion", request.url));
    }
    */
  }

  return response;
}

/**
 * Matcher: ejecutar middleware en TODAS las rutas EXCEPTO:
 * - API routes (/api/*, /next_api/*)
 * - Assets estáticos de Next.js (/_next/*)
 * - Imágenes optimizadas (/_next/image)
 * - Favicon
 */
export const config = {
  matcher: [
    "/((?!api/|next_api/|_next/static|_next/image|favicon.ico|images/|fonts/).*)",
  ],
};
