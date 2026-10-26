import {
  EXPEDICAO_APP_PATH,
  EXPEDICAO_APP_PATH_CURTO,
  EXPEDICAO_PATH,
  PREFIXO_HOST_ENTREGADOR,
  QUERY_EXPEDICAO,
  QUERY_EXPEDICAO_APP,
} from '@/src/application/expedicao/app/constantesSuperficie'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

export type SuperficieExpedicaoDetectada = 'app' | 'bancada'

function pathExpedicao(pathname: string | null | undefined): string {
  return stripGestaoEmpresaSlugFromPath(String(pathname ?? '').split('?')[0] || '')
}

export function isSinalExpedicaoSearch(search?: string | null): boolean {
  const raw = String(search ?? '').replace(/^\?/, '')
  if (!raw) return false
  return new URLSearchParams(raw).has(QUERY_EXPEDICAO)
}

export function isSinalExpedicaoAppSearch(search?: string | null): boolean {
  const raw = String(search ?? '').replace(/^\?/, '')
  if (!raw) return false
  return new URLSearchParams(raw).has(QUERY_EXPEDICAO_APP)
}

export function isRotaExpedicaoApp(pathname: string | null | undefined): boolean {
  const path = pathExpedicao(pathname)
  return (
    path === EXPEDICAO_APP_PATH ||
    path.startsWith(`${EXPEDICAO_APP_PATH}/`) ||
    path === EXPEDICAO_APP_PATH_CURTO ||
    path.startsWith(`${EXPEDICAO_APP_PATH_CURTO}/`)
  )
}

export function isHostEntregadorApp(host?: string | null): boolean {
  const nome = String(host ?? '')
    .split(':')[0]
    .trim()
    .toLowerCase()
  return nome.startsWith(PREFIXO_HOST_ENTREGADOR)
}

export function isSuperficieExpedicaoApp(input?: {
  pathname?: string | null
  search?: string | null
  host?: string | null
}): boolean {
  if (isRotaExpedicaoApp(input?.pathname)) return true
  if (isSinalExpedicaoAppSearch(input?.search)) return true
  if (isHostEntregadorApp(input?.host)) return true
  return false
}

/** App tem prioridade. Bancada é `/expedicao` ou `?expedicao` sem sinal de app. */
export function resolverSuperficieExpedicao(input?: {
  pathname?: string | null
  search?: string | null
  host?: string | null
}): SuperficieExpedicaoDetectada | null {
  if (isSuperficieExpedicaoApp(input)) return 'app'
  const path = pathExpedicao(input?.pathname)
  const rotaBancada = path === EXPEDICAO_PATH || path.startsWith(`${EXPEDICAO_PATH}/`)
  if (rotaBancada || isSinalExpedicaoSearch(input?.search)) return 'bancada'
  return null
}
