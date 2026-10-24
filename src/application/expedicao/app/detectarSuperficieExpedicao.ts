import {
  EXPEDICAO_APP_PATH,
  EXPEDICAO_APP_PATH_CURTO,
  PREFIXO_HOST_ENTREGADOR,
  QUERY_EXPEDICAO_APP,
} from '@/src/application/expedicao/app/constantesSuperficie'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

export function isSinalExpedicaoAppSearch(search?: string | null): boolean {
  const raw = String(search ?? '').replace(/^\?/, '')
  if (!raw) return false
  return new URLSearchParams(raw).has(QUERY_EXPEDICAO_APP)
}

export function isRotaExpedicaoApp(pathname: string | null | undefined): boolean {
  const path = stripGestaoEmpresaSlugFromPath(String(pathname ?? '').split('?')[0] || '')
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
  if (typeof window !== 'undefined' && 'Capacitor' in window) return true
  return false
}
