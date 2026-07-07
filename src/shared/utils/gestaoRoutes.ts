/**
 * Rotas ERP com tenant no path: `/gestao/{empresaSlug}/{modulo}`.
 * Ex.: `/gestao/nexsyn-cmc6u1ef/portal-contador`
 */

export const GESTAO_PREFIX = '/gestao'

/** Rotas que não recebem prefixo `/gestao/{empresaSlug}` (hub, auth, APIs públicas). */
const GESTAO_EXCLUDED_PREFIXES = [
  '/login',
  '/registro',
  '/confirmar-email',
  '/esqueci-senha',
  '/redefinir-senha',
  '/meus-apps',
  '/hub',
  '/api',
  '/notas-fiscais',
  '/cardapio',
] as const

const EMPRESA_SLUG_PATTERN = /^.+-[a-z0-9]{8}$/i

export function isEmpresaSlugParam(value: string | null | undefined): boolean {
  if (!value) return false
  return EMPRESA_SLUG_PATTERN.test(value)
}

export function isGestaoScopedPath(pathname: string): boolean {
  if (!pathname || pathname === '/') return false
  if (pathname.startsWith(`${GESTAO_PREFIX}/`)) {
    const inner = stripGestaoEmpresaSlugFromPath(pathname)
    return inner !== pathname && isGestaoScopedPath(inner)
  }
  return !GESTAO_EXCLUDED_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`)
  )
}

export function parseEmpresaSlugFromPath(pathname: string): string | null {
  if (!pathname.startsWith(`${GESTAO_PREFIX}/`)) return null
  const rest = pathname.slice(GESTAO_PREFIX.length + 1)
  const slash = rest.indexOf('/')
  const empresaSlug = slash === -1 ? rest : rest.slice(0, slash)
  return isEmpresaSlugParam(empresaSlug) ? empresaSlug : null
}

/** Path do módulo sem `/gestao/{empresaSlug}` (ex.: `/portal-contador`). */
export function stripGestaoEmpresaSlugFromPath(pathname: string): string {
  const empresaSlug = parseEmpresaSlugFromPath(pathname)
  if (!empresaSlug) return pathname
  const prefix = `${GESTAO_PREFIX}/${empresaSlug}`
  if (pathname === prefix) return '/dashboard'
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || '/dashboard'
  }
  return pathname
}

export function buildGestaoPath(empresaSlug: string, modulePath: string): string {
  const [pathPart, queryPart] = modulePath.split('?')
  const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`
  const base = `${GESTAO_PREFIX}/${empresaSlug}${normalized === '/' ? '/dashboard' : normalized}`
  return queryPart ? `${base}?${queryPart}` : base
}

export function parseEmpresaSlugFromSearch(search: string): string | null {
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return null
  const first = raw.split('&')[0]
  if (!first || first.includes('=')) return null
  return isEmpresaSlugParam(first) ? first : null
}

/** Remove slug legado da query (`?nexsyn-xxx&outros=...`). */
export function stripEmpresaSlugFromSearch(search: string, empresaSlug: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search
  if (!raw) return ''

  const parts = raw.split('&')
  const rest: string[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (i === 0 && !part.includes('=') && isEmpresaSlugParam(part)) {
      continue
    }
    rest.push(part)
  }
  return rest.length ? `?${rest.join('&')}` : ''
}

export function matchesModulePath(pathname: string, modulePath: string): boolean {
  const [moduleBase, moduleQs] = modulePath.split('?')
  const current = stripGestaoEmpresaSlugFromPath(pathname)
  const baseMatch = current === moduleBase || current.startsWith(`${moduleBase}/`)
  if (!baseMatch) return false
  if (!moduleQs) return true
  if (typeof window === 'undefined') return true
  const required = new URLSearchParams(moduleQs)
  const actual = new URLSearchParams(window.location.search)
  for (const [key, value] of required.entries()) {
    if (actual.get(key) !== value) return false
  }
  return true
}
