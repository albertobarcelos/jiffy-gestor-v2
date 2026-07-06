'use client'

import { fetchTenantRefreshAccessToken } from '@/src/shared/utils/fetchTenantRefreshAccessToken'
import { syncTenantAccessTokenClient } from '@/src/presentation/utils/syncTenantAccessTokenClient'
import { JIFFY_SESSION_EXPIRED_EVENT } from '@/src/shared/constants/sessionCoordinator'
import { useAuthStore } from '@/src/presentation/stores/authStore'

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

/**
 * Em 401, não tentar refresh em rotas públicas de auth / consultas sem sessão,
 * para evitar pedidos inúteis (ex.: senha errada no login).
 */
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
 *
 * - Injeta automaticamente `Authorization: Bearer` do Zustand (token per-tab)
 *   quando o chamador não fornecer o header. Isso garante que o BFF sempre
 *   receba o token correto da aba ativa, ignorando o cookie `tenant-token`
 *   global (que pode estar contaminado por outra aba).
 * - Em **401**, tenta renovar o JWT da empresa (`refresh-token` httpOnly),
 *   sincroniza Zustand/sessionStorage e repete o pedido **uma vez**.
 */
export async function fetchGestorApi(
  input: RequestInfo | URL,
  init?: FetchGestorApiOptions
): Promise<Response> {
  const { autoRefresh = true, ...fetchInit } = init ?? {}

  // Injetar token per-tab se o chamador não forneceu Authorization
  const existingAuth = new Headers(fetchInit.headers ?? {}).get('authorization')
  let headersComToken = fetchInit.headers
  if (!existingAuth) {
    const tenantToken = useAuthStore.getState().tenantAuth?.getAccessToken()
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

  const response = await fetch(input, nextInit)

  if (response.status !== 401 || !autoRefresh || typeof window === 'undefined') {
    return response
  }

  const pathname = requestPathname(input)
  if (!shouldRetryGestorSessionAfter401(pathname)) {
    return response
  }

  const newToken = await fetchTenantRefreshAccessToken()
  if (!newToken) {
    // Sessão morta: notificar o AuthGuard para redirecionar ao login.
    // Evitar redirect em rotas públicas para não entrar em loop.
    if (!isPublicAuthPath(window.location.pathname)) {
      window.dispatchEvent(new CustomEvent(JIFFY_SESSION_EXPIRED_EVENT))
    }
    return response
  }

  try {
    syncTenantAccessTokenClient(newToken)
  } catch {
    return response
  }

  const retryHeaders = new Headers(fetchInit.headers)
  retryHeaders.set('Authorization', `Bearer ${newToken}`)

  return fetch(input, { ...nextInit, headers: retryHeaders })
}
