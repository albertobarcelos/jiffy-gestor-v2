import { fetchTenantRefreshAccessToken } from '@/src/shared/utils/fetchTenantRefreshAccessToken'
import { JIFFY_SESSION_EXPIRED_EVENT } from '@/src/shared/constants/sessionCoordinator'
import { getTabTenantToken, setTabTenantToken } from '@/src/shared/utils/tabSession'
import { getGestorApiSession } from '@/src/infrastructure/api/gestorApiSession'

const PUBLIC_AUTH_PATHS = [
  '/login',
  '/registro',
  '/esqueci-senha',
  '/redefinir-senha',
  '/confirmar-email',
  '/notas-fiscais',
]

function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

function requestPathname(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return new URL(input).pathname
    }
    const q = input.indexOf('?')
    return q >= 0 ? input.slice(0, q) : input
  }
  if (input instanceof Request) {
    return new URL(input.url).pathname
  }
  return input.pathname
}

function respostaFalhaDeRede(pathname: string, error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Falha de rede'
  console.warn(`[fetchGestorApi] ${pathname}: ${message}`)
  return new Response(JSON.stringify({ error: 'Falha de rede' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  })
}

function shouldRetryGestorSessionAfter401(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) {
    return false
  }
  if (pathname === '/api/auth/refresh-token') {
    return false
  }
  if (pathname.startsWith('/api/auth/login')) {
    return false
  }
  if (pathname.startsWith('/api/auth/usuario/')) {
    const rest = pathname.slice('/api/auth/usuario/'.length)
    if (
      rest.startsWith('registro') ||
      rest.startsWith('auto-registro') ||
      rest.startsWith('confirmar-email') ||
      rest.startsWith('redefinir-senha') ||
      rest.startsWith('esqueci-senha') ||
      rest.startsWith('reenviar-confirmacao') ||
      rest === 'me' ||
      rest.startsWith('me/senha')
    ) {
      return false
    }
  }
  if (pathname.startsWith('/api/public/')) {
    return false
  }
  if (pathname.startsWith('/api/consulta-cnpj')) {
    return false
  }
  if (pathname.startsWith('/api/consulta-cep')) {
    return false
  }
  return true
}

export type FetchGestorApiOptions = RequestInit & {
  /** Se `false`, não tenta refresh + retry em 401. Default: `true`. */
  autoRefresh?: boolean
}

/**
 * `fetch` para rotas `/api/*` do próprio app.
 * Token da sessão vem da porta `configureGestorApiSession` (presentation).
 */
export async function fetchGestorApi(
  input: RequestInfo | URL,
  init?: FetchGestorApiOptions
): Promise<Response> {
  const { autoRefresh = true, ...fetchInit } = init ?? {}
  const session = getGestorApiSession()

  const existingAuth = new Headers(fetchInit.headers ?? {}).get('authorization')
  let headersComToken = fetchInit.headers
  if (!existingAuth) {
    const tenantToken = session?.getAccessToken() || getTabTenantToken()
    if (tenantToken) {
      const h = new Headers(fetchInit.headers ?? {})
      h.set('Authorization', `Bearer ${tenantToken}`)
      headersComToken = h
    }
  }

  const nextInit: RequestInit = {
    ...fetchInit,
    headers: headersComToken,
    credentials: fetchInit.credentials ?? 'include',
  }

  const pathname = requestPathname(input)
  let response: Response
  try {
    response = await fetch(input, nextInit)
  } catch (error) {
    return respostaFalhaDeRede(pathname, error)
  }

  if (response.status !== 401 || !autoRefresh || typeof window === 'undefined') {
    return response
  }

  if (!shouldRetryGestorSessionAfter401(pathname)) {
    return response
  }

  const newToken = await fetchTenantRefreshAccessToken()
  if (!newToken) {
    if (!isPublicAuthPath(window.location.pathname)) {
      window.dispatchEvent(new CustomEvent(JIFFY_SESSION_EXPIRED_EVENT))
    }
    return response
  }

  if (session) {
    if (!session.syncAccessToken(newToken)) {
      if (!isPublicAuthPath(window.location.pathname)) {
        window.dispatchEvent(new CustomEvent(JIFFY_SESSION_EXPIRED_EVENT))
      }
      return response
    }
  } else {
    setTabTenantToken(newToken)
  }

  const retryHeaders = new Headers(fetchInit.headers)
  retryHeaders.set('Authorization', `Bearer ${newToken}`)

  try {
    return await fetch(input, { ...nextInit, headers: retryHeaders })
  } catch (error) {
    return respostaFalhaDeRede(pathname, error)
  }
}
