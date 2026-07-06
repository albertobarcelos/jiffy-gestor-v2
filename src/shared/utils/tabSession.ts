import {
  SESSION_STORAGE_TENANT_TOKEN,
  SESSION_STORAGE_SESSION_NONCE,
  SESSION_STORAGE_EMPRESA_SLUG,
} from '@/src/shared/constants/sessionCoordinator'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'
import {
  buildGestaoPath,
  isGestaoScopedPath,
  parseEmpresaSlugFromPath,
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
 * Grava access token + nome da empresa no localStorage temporário para que a
 * nova aba (aberta com `noopener`) possa consumir no boot.
 *
 * Retorna `{ nonce, empParam }` — o `empParam` já formatado para a URL
 * (ex: `nexsyn-ab12cd34`), usando os 8 primeiros caracteres do ID da empresa.
 */
export function prepareTabSession(
  accessToken: string,
  empresaNome: string,
  empresaId: string
): { nonce: string; empParam: string } {
  const nonce = crypto.randomUUID()
  const empParam = buildEmpresaUrlParam(empresaNome, empresaId)

  const key = `jiffy:pending-session:${nonce}`
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ accessToken, empParam, ts: Date.now() })
    )
  } catch { /* localStorage cheio */ }

  return { nonce, empParam }
}

/**
 * Na aba recém-aberta, resolve o nonce a partir do valor de `emp` na URL,
 * consome o pending session do localStorage e o move para sessionStorage.
 *
 * @param empParam  valor do query param `emp` (ex: `nexsyn-ab12cd34`)
 * @returns accessToken se encontrado, `null` caso contrário
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
        ts?: number
      }

      if (data.empParam !== empParam) continue

      localStorage.removeItem(key)
      const age = Date.now() - (data.ts ?? 0)
      if (age > 30_000 || !data.accessToken) return null

      const nonce = key.replace('jiffy:pending-session:', '')
      sessionStorage.setItem(SESSION_STORAGE_TENANT_TOKEN, data.accessToken)
      sessionStorage.setItem(SESSION_STORAGE_SESSION_NONCE, nonce)
      sessionStorage.setItem(SESSION_STORAGE_EMPRESA_SLUG, empParam)
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

/** Grava/atualiza o access token per-tab (ex: após refresh). */
export function setTabTenantToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_TOKEN, token)
  } catch { /* ignore */ }
}

/** Remove sessão per-tab (logout da empresa). */
export function clearTabSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_TENANT_TOKEN)
    sessionStorage.removeItem(SESSION_STORAGE_SESSION_NONCE)
    sessionStorage.removeItem(SESSION_STORAGE_EMPRESA_SLUG)
  } catch { /* ignore */ }
}

/** Verifica se esta aba foi aberta via hub (tem nonce). */
export function hasSessionNonce(): boolean {
  try {
    return Boolean(sessionStorage.getItem(SESSION_STORAGE_SESSION_NONCE))
  } catch {
    return false
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
 * Chaves que são o token de empresa na query (`{nome-url}-{8chars}`), como em `TabSessionBootstrap.getEmpParam`.
 * O sufixo são os 8 primeiros caracteres do id **sem hífen** (não é só hex — UUID pode gerar letras como `u`).
 * `URLSearchParams` serializa valor vazio como `chave=`; o nome da chave nunca contém `=`.
 */
function isEmpresaSlugQueryKey(key: string, sessionSlug: string): boolean {
  if (!key || key.includes('=')) return false
  if (key === sessionSlug) return true
  return /^.+-[a-z0-9]{8}$/i.test(key)
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

/** @deprecated Use `syncEmpresaUrlPathFromSession` — alias de compatibilidade. */
export function syncEmpresaUrlQueryFromSession(): void {
  syncEmpresaUrlPathFromSession()
}

/**
 * Extrai os 8 caracteres do ID da empresa do `empParam` (sufixo após último hífen).
 * Retorna `null` se o formato for inválido.
 */
export function extractEmpresaIdPrefix(empParam: string | null): string | null {
  if (!empParam || empParam.length < 9) return null
  return empParam.slice(-8)
}

/**
 * Configura a sessão per-tab manualmente (fallback quando não há pending session).
 * Gera um nonce, grava no sessionStorage e retorna.
 */
export function bootstrapTabSessionManually(accessToken: string, empParam: string): void {
  const nonce = crypto.randomUUID()
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_TOKEN, accessToken)
    sessionStorage.setItem(SESSION_STORAGE_SESSION_NONCE, nonce)
    sessionStorage.setItem(SESSION_STORAGE_EMPRESA_SLUG, empParam)
  } catch { /* ignore */ }
}
