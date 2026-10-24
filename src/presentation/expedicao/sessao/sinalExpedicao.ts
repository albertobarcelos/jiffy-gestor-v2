import { QUERY_EXPEDICAO } from '@/src/presentation/expedicao/constantes'
import {
  isRotaExpedicaoApp,
  isSinalExpedicaoAppSearch,
  isSuperficieExpedicaoApp,
} from '@/src/application/expedicao/app/detectarSuperficieExpedicao'
import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'

export { isRotaExpedicaoApp, isSinalExpedicaoAppSearch, isSuperficieExpedicaoApp }

export function isSinalExpedicaoSearch(search?: string | null): boolean {
  const raw = String(search ?? '').replace(/^\?/, '')
  if (!raw) return false
  return new URLSearchParams(raw).has(QUERY_EXPEDICAO)
}

export function isRotaExpedicao(pathname: string | null | undefined): boolean {
  const path = stripGestaoEmpresaSlugFromPath(String(pathname ?? '').split('?')[0] || '')
  return (
    path === '/expedicao' ||
    path.startsWith('/expedicao/') ||
    path === '/e' ||
    path.startsWith('/e/')
  )
}

export function isRotaExpedicaoKiosk(pathname: string | null, search = ''): boolean {
  if (!isRotaExpedicao(pathname)) return false
  return isSinalExpedicaoSearch(search)
}

export function sinalExpedicaoNesteBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return isSinalExpedicaoSearch(window.location.search) || isRotaExpedicao(window.location.pathname)
}
