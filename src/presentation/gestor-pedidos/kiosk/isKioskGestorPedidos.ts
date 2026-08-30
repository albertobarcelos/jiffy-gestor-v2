import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import { PEDIDOS_PATH, QUERY_GESTOR } from '../constantes'

/** Tauri 2 com `withGlobalTauri: false` não põe `__TAURI__` no window. */
export function detectarRuntimeTauri(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI__' in window || '__TAURI_INTERNALS__' in window
}

const STORAGE_SINAL_KIOSK_FLOW = 'jiffy.flow.kiosk'

export function persistirSinalKioskFlow(): void {
  try {
    sessionStorage.setItem(STORAGE_SINAL_KIOSK_FLOW, '1')
  } catch {
    /* noop */
  }
}

export function lerSinalKioskFlowPersistido(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_SINAL_KIOSK_FLOW) === '1'
  } catch {
    return false
  }
}

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

/** Quadro / lista no Flow: path `/pedidos` + Tauri, `?gestor` ou sinal já persistido. */
export function isRotaKioskPedidos(pathname: string, search = ''): boolean {
  if (!isRotaPedidos(stripGestaoEmpresaSlugFromPath(pathname))) return false
  const hasTauri =
    typeof window !== 'undefined' &&
    (detectarRuntimeTauri() || lerSinalKioskFlowPersistido())
  const sinal = { hasTauri, search }
  if (!isSinalKioskGestorPedidos(sinal)) return false
  persistirSinalKioskFlow()
  return true
}

/** Quadro / lista de empresas no casco Windows / `?gestor` (não o ERP web). */
export function isQuadroKioskAtual(): boolean {
  if (typeof window === 'undefined') return false
  return isRotaKioskPedidos(window.location.pathname, window.location.search)
}
