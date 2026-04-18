import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 1. Dejamos que la solicitud continúe su curso normal
  const response = NextResponse.next()
  
  // 2. Cabeceras de seguridad para Iframes (útil si integras vistas externas)
  response.headers.set('X-Frame-Options', 'ALLOWALL')
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self' *")
  
  return response
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas de la app EXCEPTO:
     * - /api/ (Permite que Stripe entre al webhook sin ser interrumpido)
     * - /_next/static (archivos estáticos de Next)
     * - /_next/image (imágenes)
     * - favicon.ico (ícono del navegador)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}