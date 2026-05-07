import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { queryRegistroConviteNovoUsuarioFromLoginSearch } from '@/src/presentation/components/features/auth/utils/inviteLoginPayload'

/**
 * Middleware para proteção de rotas - OTIMIZADO
 * Validação mínima de token para máxima performance
 * Não usa jsonwebtoken para ser compatível com Edge Runtime
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  /** Convite novo usuário: não renderiza /login — vai direto para /registro (evita “flash” do login). */
  if (pathname === '/login') {
    const q = queryRegistroConviteNovoUsuarioFromLoginSearch(request.nextUrl.search)
    if (q) {
      const dest = new URL('/registro', request.url)
      dest.search = q.toString()
      return NextResponse.redirect(dest)
    }
  }

  // Rotas públicas - bypass rápido
  if (
    pathname === '/login' ||
    pathname === '/registro' ||
    pathname.startsWith('/registro/') ||
    pathname === '/confirmar-email' ||
    pathname === '/esqueci-senha' ||
    pathname === '/redefinir-senha' ||
    pathname.startsWith('/redefinir-senha/') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/usuario/') ||
    pathname.startsWith('/api/consulta-cnpj') ||
    pathname.startsWith('/api/consulta-cep') ||
    pathname.startsWith('/notas-fiscais') ||
    pathname.startsWith('/api/public/notas-fiscais-consumidor')
  ) {
    return NextResponse.next()
  }

  // Raiz → dashboard (rota canônica)
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/meus-apps', request.url))
  }

  // Antiga URL /dashboard/v2 → /dashboard
  if (pathname === '/dashboard/v2' || pathname === '/dashboard/v2/') {
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

