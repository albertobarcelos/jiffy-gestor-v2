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
