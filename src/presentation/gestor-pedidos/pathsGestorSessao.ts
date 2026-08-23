import { HUB_PATH } from '@/src/shared/constants/hubRoutes'
import { buildGestaoPath } from '@/src/shared/utils/gestaoRoutes'
import { PEDIDOS_PATH, QUERY_GESTOR } from './constantes'
import { isSinalKioskGestorPedidos } from './isKioskGestorPedidos'

export function lerSinalGestorDoBrowser(): { hasTauri: boolean; search: string } {
  if (typeof window === 'undefined') {
    return { hasTauri: false, search: '' }
  }
  return {
    hasTauri: '__TAURI__' in window,
    search: window.location.search,
  }
}

export function pathLoginComSinalGestor(sinal: {
  hasTauri: boolean
  search?: string
}): string {
  return isSinalKioskGestorPedidos(sinal) ? `/login?${QUERY_GESTOR}` : '/login'
}

export function pathHubComSinalGestor(sinal: {
  hasTauri: boolean
  search?: string
}): string {
  return isSinalKioskGestorPedidos(sinal) ? `${HUB_PATH}?${QUERY_GESTOR}` : HUB_PATH
}

export function pathPedidosGestor(empParam: string): string {
  return buildGestaoPath(empParam, `${PEDIDOS_PATH}?${QUERY_GESTOR}`)
}

export function urlLoginDaSessaoAtual(): string {
  return pathLoginComSinalGestor(lerSinalGestorDoBrowser())
}

export function urlHubDaSessaoAtual(): string {
  return pathHubComSinalGestor(lerSinalGestorDoBrowser())
}

function normalizarSearch(search: string): string {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  p.sort()
  const s = p.toString()
  return s ? `?${s}` : ''
}

/** Compara path + query para não recarregar a mesma rota (loop no `/login?gestor`). */
export function mesmaRotaLocal(
  atual: { pathname: string; search: string },
  dest: string,
  origin = 'http://localhost'
): boolean {
  const next = new URL(dest, origin)
  return (
    atual.pathname === next.pathname &&
    normalizarSearch(atual.search) === normalizarSearch(next.search)
  )
}

export function estaNaMesmaRotaLocal(dest: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return mesmaRotaLocal(
      { pathname: window.location.pathname, search: window.location.search },
      dest,
      window.location.origin
    )
  } catch {
    return false
  }
}

/** Só navega se ainda não estiver no login desta sessão (kiosk ou browser). */
export function irParaLoginDaSessaoAtual(modo: 'replace' | 'assign' = 'replace'): void {
  const dest = urlLoginDaSessaoAtual()
  if (estaNaMesmaRotaLocal(dest)) return
  if (modo === 'assign') {
    window.location.assign(dest)
    return
  }
  window.location.replace(dest)
}
