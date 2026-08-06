import {
  SESSION_STORAGE_TENANT_TOKEN,
  SESSION_STORAGE_EMPRESA_SLUG,
  SESSION_STORAGE_EMPRESA_ID,
} from '@/src/shared/constants/sessionCoordinator'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'
import {
  buildGestaoPath,
  isGestaoScopedPath,
  parseEmpresaSlugFromSearch,
  stripEmpresaSlugFromSearch,
  stripGestaoEmpresaSlugFromPath,
} from '@/src/shared/utils/gestaoRoutes'

/**
 * Segmento de query usado na URL da aba ERP (ex.: `nexsyn-ab12cd34`):
 * slug do nome + 8 primeiros hex do id (sem hífens).
 */
export function buildEmpresaUrlParam(empresaNome: string, empresaId: string): string {
  const slug = empresaNomeParaSlugUrl(empresaNome)
  const shortId = empresaId.replace(/-/g, '').slice(0, 8)
  return `${slug}-${shortId}`
}

/**
 * Decodifica o claim `empresaId` do JWT sem verificar assinatura.
 * Leve — usa apenas `atob`/base64; sem dependência de `jsonwebtoken`.
 */
function extractEmpresaIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64)) as Record<string, unknown>
    return typeof payload.empresaId === 'string' ? payload.empresaId : null
  } catch {
    return null
  }
}

/**
 * Grava access token + empresa no localStorage temporário para a nova aba consumir no boot.
 * Retorna o segmento de URL da empresa (`empParam`).
 */
export function prepareTabSession(
  accessToken: string,
  empresaNome: string,
  empresaId: string
): string {
  const pendingId = crypto.randomUUID()
  const empParam = buildEmpresaUrlParam(empresaNome, empresaId)

  const key = `jiffy:pending-session:${pendingId}`
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ accessToken, empParam, empresaId, ts: Date.now() })
    )
  } catch {
    /* localStorage cheio */
  }

  return empParam
}

/**
 * Na aba recém-aberta, consome pending session do localStorage → sessionStorage.
 */
export function consumeTabSession(empParam: string | null): string | null {
  if (!empParam) return null

  try {
    const allKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('jiffy:pending-session:')) allKeys.push(k)
    }

    for (const key of allKeys) {
      const raw = localStorage.getItem(key)
      if (!raw) continue

      const data = JSON.parse(raw) as {
        accessToken?: string
        empParam?: string
        empresaId?: string
        ts?: number
      }

      if (data.empParam !== empParam) continue

      localStorage.removeItem(key)
      const age = Date.now() - (data.ts ?? 0)
      if (age > 30_000 || !data.accessToken) return null

      const resolvedEmpresaId =
        data.empresaId ?? extractEmpresaIdFromJwt(data.accessToken)

      sessionStorage.setItem(SESSION_STORAGE_TENANT_TOKEN, data.accessToken)
      sessionStorage.setItem(SESSION_STORAGE_EMPRESA_SLUG, empParam)
      if (resolvedEmpresaId) {
        sessionStorage.setItem(SESSION_STORAGE_EMPRESA_ID, resolvedEmpresaId)
      }
      return data.accessToken
    }
  } catch {
    /* ignore */
  }

  return null
}

/** Lê o access token da empresa isolado por aba (sessionStorage). */
export function getTabTenantToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_TENANT_TOKEN)
  } catch {
    return null
  }
}

/** Lê o UUID completo da empresa desta aba (fonte de verdade canônica). */
export function getTabEmpresaId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_EMPRESA_ID)
  } catch {
    return null
  }
}

/** Grava/atualiza o access token per-tab (ex: após refresh). */
export function setTabTenantToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_TOKEN, token)
  } catch {
    /* ignore */
  }
}

/** Grava o UUID completo da empresa no sessionStorage per-tab. */
export function setTabEmpresaId(empresaId: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_EMPRESA_ID, empresaId)
  } catch {
    /* ignore */
  }
}

/** Remove sessão per-tab (logout da empresa). */
export function clearTabSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_TENANT_TOKEN)
    sessionStorage.removeItem(SESSION_STORAGE_EMPRESA_SLUG)
    sessionStorage.removeItem(SESSION_STORAGE_EMPRESA_ID)
  } catch {
    /* ignore */
  }
}

/** Retorna o slug da empresa para uso na URL (ex: `nexsyn-ab12cd34`), ou `null`. */
export function getEmpresaSlugParam(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_EMPRESA_SLUG)
  } catch {
    return null
  }
}

/**
 * Mantém tenant no path: `/gestao/{empresaSlug}/{modulo}`.
 * Migra URLs legadas `?{empresaSlug}` para o novo formato.
 */
export function syncEmpresaUrlPathFromSession(): void {
  if (typeof window === 'undefined') return
  const slug = getEmpresaSlugParam()
  if (!slug) return

  const { pathname, search, href } = window.location

  if (!isGestaoScopedPath(pathname) && !parseEmpresaSlugFromSearch(search)) {
    return
  }

  let modulePath = stripGestaoEmpresaSlugFromPath(pathname)
  const legacyEmpresaSlug = parseEmpresaSlugFromSearch(search)

  if (!pathname.startsWith('/gestao/') && legacyEmpresaSlug) {
    modulePath = pathname || '/dashboard'
  }

  const cleanSearch = stripEmpresaSlugFromSearch(search, slug)
  const targetPath = buildGestaoPath(slug, modulePath)
  const targetUrl = `${targetPath}${cleanSearch}`

  const currentUrl = `${pathname}${search}`
  if (currentUrl === targetUrl) return

  const url = new URL(href)
  url.pathname = targetPath
  url.search = cleanSearch ? cleanSearch.replace(/^\?/, '') : ''
  window.history.replaceState(null, '', url.toString())
}

/**
 * Extrai os 8 caracteres do ID da empresa do slug da URL (sufixo após último hífen).
 * Usado para alinhar URL canônica ↔ `empresaId` do token.
 */
export function extractEmpresaIdPrefix(empParam: string | null): string | null {
  if (!empParam || empParam.length < 9) return null
  return empParam.slice(-8)
}

/**
 * Grava token + slug + empresaId no sessionStorage desta aba (após escolher-empresa / troca).
 */
export function bootstrapTabSessionManually(
  accessToken: string,
  empParam: string,
  empresaId?: string
): void {
  const resolvedEmpresaId = empresaId ?? extractEmpresaIdFromJwt(accessToken)
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_TOKEN, accessToken)
    sessionStorage.setItem(SESSION_STORAGE_EMPRESA_SLUG, empParam)
    if (resolvedEmpresaId) {
      sessionStorage.setItem(SESSION_STORAGE_EMPRESA_ID, resolvedEmpresaId)
    }
  } catch {
    /* ignore */
  }
}
