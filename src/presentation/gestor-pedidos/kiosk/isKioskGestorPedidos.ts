import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { PEDIDOS_PATH, QUERY_GESTOR } from '../constantes'

function pathSemQuery(pathModulo: string): string {
  return pathModulo.split('?')[0] || ''
}

export function isRotaPedidos(pathModulo: string): boolean {
  const path = pathSemQuery(pathModulo)
  return path === PEDIDOS_PATH || path.startsWith(`${PEDIDOS_PATH}/`)
}

export function isSinalKioskGestorPedidos(input: {
  hasTauri: boolean
  search?: string
}): boolean {
  if (input.hasTauri) return true
  const raw = String(input.search ?? '').replace(/^\?/, '')
  if (!raw) return false
  const query = new URLSearchParams(raw)
  return query.has(QUERY_GESTOR)
}

/**
 * TopNav some em `/pedidos` com Tauri ou `?gestor`.
 * Fácil de remover: deixar de chamar no ErpAppShell.
 */
export function deveEsconderTopNavNoGestorPedidos(
  pathModulo: string,
  sinal: { hasTauri: boolean; search?: string }
): boolean {
  if (!isRotaPedidos(pathModulo)) return false
  return isSinalKioskGestorPedidos(sinal)
}

/** Quadro de pedidos no casco Windows / `?gestor` (não o ERP web). */
export function isQuadroKioskAtual(): boolean {
  if (typeof window === 'undefined') return false
  const sinal = {
    hasTauri: '__TAURI__' in window,
    search: window.location.search,
  }
  if (!isSinalKioskGestorPedidos(sinal)) return false
  return isRotaPedidos(stripGestaoEmpresaSlugFromPath(window.location.pathname))
}
