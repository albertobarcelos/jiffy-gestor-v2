import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware para proteção de rotas - OTIMIZADO
 * Validação mínima de token para máxima performance
 * Não usa jsonwebtoken para ser compatível com Edge Runtime
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rotas públicas - bypass rápido
  if (
    pathname === '/login' || 
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/consulta-cnpj') ||
    pathname.startsWith('/api/consulta-cep')
  ) {
    return NextResponse.next()
  }

  // Se está na raiz, redireciona para dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Verificar token no cookie OU no header Authorization
  const cookieToken = request.cookies.get('auth-token')?.value
  const authHeader = request.headers.get('authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  
  const token = cookieToken || headerToken
  const isApiRoute = pathname.startsWith('/api/')
  
  // Rotas protegidas - verificação mínima
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Para rotas de página e API, apenas verifica se token existe
  // A validação completa JWT será feita na camada de aplicação (Node.js runtime)
  // Isso evita usar APIs Node.js no Edge Runtime
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - videos (video files)
     * - images (image files)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|videos|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

