import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Estas cabeceras permiten que tu sitio se vea correctamente en diferentes navegadores
  // y resuelven el aviso de seguridad sin usar sintaxis obsoleta.
  response.headers.set('X-Frame-Options', 'ALLOWALL')
  response.headers.set('Content-Security-Policy', "frame-ancestors 'self' *")
  
  return response
}

// El matcher define en qué páginas se ejecuta el middleware. 
// Esta es la forma estándar actual para Next.js 14/15.
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}