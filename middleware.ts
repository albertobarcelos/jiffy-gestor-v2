import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  AUTH_COOKIE_IDENTITY,
  AUTH_COOKIE_LEGACY,
  AUTH_COOKIE_REFRESH,
  AUTH_COOKIE_TENANT,
} from '@/src/shared/utils/authCookies'
import {
  HUB_PATH,
  isHubPathname,
} from '@/src/shared/constants/hubRoutes'
import { queryRegistroConviteNovoUsuarioFromLoginSearch } from '@/src/presentation/components/features/auth/utils/inviteLoginPayload'
import {
  buildGestaoPath,
  isGestaoScopedPath,
  parseEmpresaSlugFromPath,
  parseEmpresaSlugFromSearch,
  stripEmpresaSlugFromSearch,
} from '@/src/shared/utils/gestaoRoutes'
import {
  PATH_BOLHA_HTML,
  PEDIDOS_PATH,
  QUERY_GESTOR,
  TOKEN_USER_AGENT_FREDY,
  TOKEN_USER_AGENT_JIFFY_FLOW,
} from '@/src/presentation/gestor-pedidos/constantes'
import { QUERY_EXPEDICAO } from '@/src/presentation/expedicao/constantes'
import {
  EXPEDICAO_APP_PATH,
  EXPEDICAO_APP_PATH_CURTO,
  QUERY_EXPEDICAO_APP,
} from '@/src/application/expedicao/app/constantesSuperficie'
import { isHostEntregadorApp } from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import { isRotaPermitidaNoJiffyFlow } from '@/src/presentation/gestor-pedidos/kiosk/isKioskGestorPedidos'
import {
  isCardapioPublicRedirectEnabled,
  mapGestorPublicPathToCardapioUrl,
} from '@/src/shared/utils/cardapioPublicUrl'

function pedidoVeioDoAppJiffyFlow(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') ?? ''
  return ua.includes(TOKEN_USER_AGENT_FREDY) || ua.includes(TOKEN_USER_AGENT_JIFFY_FLOW)
}

function urlListaEmpresasFlow(request: NextRequest): URL {
  return new URL(`${PEDIDOS_PATH}/empresas?${QUERY_GESTOR}`, request.url)
}

function veioDoAppEntregador(request: NextRequest): boolean {
  const path = request.nextUrl.pathname
  return (
    path === EXPEDICAO_APP_PATH ||
    path.startsWith(`${EXPEDICAO_APP_PATH}/`) ||
    path === EXPEDICAO_APP_PATH_CURTO ||
    path.startsWith(`${EXPEDICAO_APP_PATH_CURTO}/`) ||
    isHostEntregadorApp(request.headers.get('host')) ||
    request.nextUrl.searchParams.has(QUERY_EXPEDICAO_APP)
  )
}

function urlLoginPreservandoGestor(request: NextRequest): URL {
  const dest = new URL('/login', request.url)
  if (veioDoAppEntregador(request) || request.nextUrl.searchParams.has(QUERY_EXPEDICAO)) {
    dest.searchParams.set(QUERY_EXPEDICAO, request.nextUrl.searchParams.get(QUERY_EXPEDICAO) ?? '')
    if (veioDoAppEntregador(request)) {
      dest.searchParams.set(QUERY_EXPEDICAO_APP, '')
    }
    return dest
  }
  if (
    request.nextUrl.searchParams.has(QUERY_GESTOR) ||
    pedidoVeioDoAppJiffyFlow(request)
  ) {
    dest.searchParams.set(QUERY_GESTOR, request.nextUrl.searchParams.get(QUERY_GESTOR) ?? '')
  }
  return dest
}

/**
 * Middleware para proteção de rotas - OTIMIZADO
 * Validação mínima de token para máxima performance
 * Não usa jsonwebtoken para ser compatível com Edge Runtime
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const noAppFlow = pedidoVeioDoAppJiffyFlow(request)

  /** Bolha do Fredy: HTML estático. Sem isto o UA Fredy/ manda a janela 56px para /pedidos. */
  if (pathname === PATH_BOLHA_HTML) {
    return NextResponse.next()
  }

  if (isHostEntregadorApp(request.headers.get('host')) && pathname === '/') {
    const tokenCurto =
      request.cookies.get(AUTH_COOKIE_TENANT)?.value ||
      request.cookies.get(AUTH_COOKIE_IDENTITY)?.value ||
      request.cookies.get(AUTH_COOKIE_LEGACY)?.value
    if (!tokenCurto) {
      return NextResponse.redirect(urlLoginPreservandoGestor(request))
    }
    const dest = request.nextUrl.clone()
    dest.pathname = EXPEDICAO_APP_PATH
    dest.searchParams.set(QUERY_EXPEDICAO, '')
    dest.searchParams.set(QUERY_EXPEDICAO_APP, '')
    return NextResponse.rewrite(dest)
  }

  /** O .exe não abre hub, dashboard nem o resto do Gestor web. */
  if (noAppFlow && !pathname.startsWith('/api/') && !isRotaPermitidaNoJiffyFlow(pathname)) {
    return NextResponse.redirect(urlListaEmpresasFlow(request))
  }

  /** Quadro sem empresa no .exe: lista, nunca o kanban a girar. */
  if (noAppFlow && pathname === PEDIDOS_PATH) {
    return NextResponse.redirect(urlListaEmpresasFlow(request))
  }

  /** Convite novo usuário: não renderiza /login — vai direto para /registro (evita “flash” do login). */
  if (pathname === '/login') {
    const q = queryRegistroConviteNovoUsuarioFromLoginSearch(request.nextUrl.search)
    if (q) {
      const dest = new URL('/registro', request.url)
      dest.search = q.toString()
      return NextResponse.redirect(dest)
    }
    if (
      isHostEntregadorApp(request.headers.get('host')) &&
      !request.nextUrl.searchParams.has(QUERY_EXPEDICAO_APP)
    ) {
      const dest = request.nextUrl.clone()
      dest.searchParams.set(QUERY_EXPEDICAO, '')
      dest.searchParams.set(QUERY_EXPEDICAO_APP, '')
      return NextResponse.redirect(dest)
    }
  }

  /**
   * Loja pública vive em apps/jiffy-cardapio.
   * Com NEXT_PUBLIC_CARDAPIO_PUBLIC_URL / CARDAPIO_PUBLIC_URL,
   * /delivery e /cardapio redirecionam (308) para o host do Cardápio.
   */
  if (isCardapioPublicRedirectEnabled()) {
    const cardapioDest = mapGestorPublicPathToCardapioUrl(
      pathname,
      request.nextUrl.search
    )
    if (cardapioDest) {
      return NextResponse.redirect(cardapioDest, 308)
    }
  }

  // Rotas públicas - bypass rápido
  if (
    pathname === '/ws' ||
    pathname.startsWith('/ws/') ||
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
    pathname.startsWith('/api/geolocalizacao/') ||
    pathname.startsWith('/notas-fiscais') ||
    pathname.startsWith('/api/public/notas-fiscais-consumidor') ||
    pathname === '/sw-expedicao-app.js' ||
    pathname === '/expedicao-app/manifest.webmanifest'
  ) {
    return NextResponse.next()
  }

  // Raiz → hub (rota canônica) se houver qualquer cookie de sessão; senão login
  if (pathname === '/') {
    const hasAnySessionCookie =
      Boolean(request.cookies.get(AUTH_COOKIE_IDENTITY)?.value) ||
      Boolean(request.cookies.get(AUTH_COOKIE_TENANT)?.value) ||
      Boolean(request.cookies.get(AUTH_COOKIE_REFRESH)?.value) ||
      Boolean(request.cookies.get(AUTH_COOKIE_LEGACY)?.value)
    if (!hasAnySessionCookie) {
      return NextResponse.redirect(urlLoginPreservandoGestor(request))
    }
    if (noAppFlow) {
      return NextResponse.redirect(urlListaEmpresasFlow(request))
    }
    return NextResponse.redirect(new URL(HUB_PATH, request.url))
  }

  /**
   * Hub (Minhas Empresas / perfil): o AuthGuard valida a identidade no cliente.
   * Não exigir identity cookie sozinho — após logout da empresa o token pode
   * estar só no Zustand. Mas sem nenhum cookie de sessão → login (nada a clicar).
   */
  const isHubRoute =
    isHubPathname(pathname) ||
    pathname === '/perfil' ||
    pathname.startsWith('/perfil/')
  if (isHubRoute) {
    const hasAnySessionCookie =
      Boolean(request.cookies.get(AUTH_COOKIE_IDENTITY)?.value) ||
      Boolean(request.cookies.get(AUTH_COOKIE_TENANT)?.value) ||
      Boolean(request.cookies.get(AUTH_COOKIE_REFRESH)?.value) ||
      Boolean(request.cookies.get(AUTH_COOKIE_LEGACY)?.value)
    if (!hasAnySessionCookie) {
      return NextResponse.redirect(urlLoginPreservandoGestor(request))
    }
    return NextResponse.next()
  }

  // Antiga URL /dashboard/v2 → /dashboard
  if (pathname === '/dashboard/v2' || pathname === '/dashboard/v2/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rota renomeada: /painel-contador → /portal-contador
  if (pathname.includes('/painel-contador')) {
    const dest = request.nextUrl.clone()
    dest.pathname = pathname.replace('/painel-contador', '/portal-contador')
    return NextResponse.redirect(dest)
  }

  const legacyEmpresaSlug = parseEmpresaSlugFromSearch(request.nextUrl.search)
  if (legacyEmpresaSlug && isGestaoScopedPath(pathname) && !pathname.startsWith('/gestao/')) {
    const dest = request.nextUrl.clone()
    dest.pathname = buildGestaoPath(legacyEmpresaSlug, pathname || '/dashboard')
    dest.search = stripEmpresaSlugFromSearch(request.nextUrl.search, legacyEmpresaSlug).replace(/^\?/, '')
    return NextResponse.redirect(dest)
  }

  const empresaSlug = parseEmpresaSlugFromPath(pathname)
  if (empresaSlug) {
    const inner =
      pathname === `/gestao/${empresaSlug}` || pathname === `/gestao/${empresaSlug}/`
        ? '/dashboard'
        : pathname.slice(`/gestao/${empresaSlug}`.length) || '/dashboard'

    if (pathname === `/gestao/${empresaSlug}` || pathname === `/gestao/${empresaSlug}/`) {
      const dest = request.nextUrl.clone()
      dest.pathname = buildGestaoPath(empresaSlug, '/dashboard')
      return NextResponse.redirect(dest)
    }

    if (!isGestaoScopedPath(inner)) {
      return NextResponse.next()
    }

    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = inner
    return NextResponse.rewrite(rewriteUrl)
  }

  /**
   * Flow (`?gestor`): a página decide login vs lista. Não bloquear no Edge
   * com token velho — isso deixava o WebView no robot até o compile acabar.
   */
  if (
    pathname === PEDIDOS_PATH ||
    pathname.startsWith(`${PEDIDOS_PATH}/`)
  ) {
    if (noAppFlow || request.nextUrl.searchParams.has(QUERY_GESTOR)) {
      const res = NextResponse.next()
      if (noAppFlow) {
        res.headers.set('Cache-Control', 'no-store')
      }
      return res
    }
  }

  if (
    (pathname === '/expedicao' ||
      pathname.startsWith('/expedicao/') ||
      pathname === EXPEDICAO_APP_PATH_CURTO ||
      pathname.startsWith(`${EXPEDICAO_APP_PATH_CURTO}/`) ||
      isHostEntregadorApp(request.headers.get('host'))) &&
    (request.nextUrl.searchParams.has(QUERY_EXPEDICAO) ||
      pathname === EXPEDICAO_APP_PATH ||
      pathname.startsWith(`${EXPEDICAO_APP_PATH}/`) ||
      pathname === EXPEDICAO_APP_PATH_CURTO ||
      isHostEntregadorApp(request.headers.get('host')))
  ) {
    return NextResponse.next()
  }

  const tenantTok = request.cookies.get(AUTH_COOKIE_TENANT)?.value
  const identityTok = request.cookies.get(AUTH_COOKIE_IDENTITY)?.value
  const legacyTok = request.cookies.get(AUTH_COOKIE_LEGACY)?.value
  const authHeader = request.headers.get('authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null

  const token =
    (headerToken && headerToken.length > 0 ? headerToken : null) ||
    tenantTok ||
    identityTok ||
    legacyTok
  const isApiRoute = pathname.startsWith('/api/')
  
  // Rotas protegidas - verificação mínima
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 })
    }
    return NextResponse.redirect(urlLoginPreservandoGestor(request))
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
    '/((?!_next/static|_next/image|favicon.ico|videos|images|ws(?:/|$)|jiffy-flow-bolha\\.html|sw-expedicao-app\\.js|expedicao-app/manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

