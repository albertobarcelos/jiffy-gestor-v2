import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateToken, isTokenExpired } from '@/src/shared/utils/validateToken'

/**
 * Middleware para proteção de rotas
 * Verifica autenticação antes de acessar rotas protegidas
 * Replica a lógica do Flutter com validação de token JWT
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  const { pathname } = request.nextUrl

  // Rotas públicas (não requerem autenticação)
  const publicRoutes = ['/login', '/api/auth/login']
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route))

  // Rotas protegidas
  const protectedRoutes = [
    '/dashboard',
    '/vendas',
    '/estoque',
    '/produtos',
    '/clientes',
    '/cadastros',
    '/meu-caixa',
    '/relatorios',
    '/configuracoes',
    '/hub',
  ]
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  // Rotas de API protegidas (exceto login)
  const isProtectedApiRoute = pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login')

  // Se é rota pública, permite acesso
  if (isPublicRoute) {
    // Se tem token válido e está tentando acessar login, redireciona para dashboard
    if (token && pathname === '/login') {
      const validation = validateToken(token)
      if (validation.valid && !validation.expired) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return NextResponse.next()
  }

  // Para rotas protegidas, verifica token
  if (isProtectedRoute || isProtectedApiRoute) {
    if (!token) {
      // Se é rota de API, retorna 401
      if (isProtectedApiRoute) {
        return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 })
      }
      // Se é rota de página, redireciona para login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Valida token
    const validation = validateToken(token)
    
    if (!validation.valid || validation.expired) {
      // Token inválido ou expirado
      if (isProtectedApiRoute) {
        return NextResponse.json(
          { error: validation.expired ? 'Token expirado' : 'Token inválido' },
          { status: 401 }
        )
      }
      
      // Para rotas de página, redireciona para login
      // Remove cookie inválido
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }

    // Token válido - permite acesso
    // As rotas API validarão o token novamente e extrairão informações
    return NextResponse.next()
  }

  // Se está na raiz, redireciona baseado no estado de autenticação
  if (pathname === '/') {
    if (token) {
      const validation = validateToken(token)
      if (validation.valid && !validation.expired) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

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

