import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import {
  PEDIDOS_PATH,
  PEDIDOS_WHATSAPP_PATH,
  QUERY_GESTOR,
  TOKEN_USER_AGENT_JIFFY_FLOW,
} from '../constantes'

/**
 * O .exe Jiffy Flow — não o Chrome, não o Gestor web.
 * Fonte: User-Agent da janela (sobrevive login, F5 e perda de `?gestor`).
 */
export function pedidoVeioDoAppJiffyFlow(userAgent: string | null | undefined): boolean {
  return String(userAgent ?? '').includes(TOKEN_USER_AGENT_JIFFY_FLOW)
}

/** Runtime na janela: UA do WebView, script da janela, ou IPC Tauri. */
export function estaNoAppJiffyFlow(): boolean {
  if (typeof window === 'undefined') return false
  if (pedidoVeioDoAppJiffyFlow(navigator.userAgent)) return true
  const w = window as Window & { __JIFFY_FLOW_KIOSK__?: unknown }
  return (
    w.__JIFFY_FLOW_KIOSK__ === true ||
    '__TAURI__' in window ||
    '__TAURI_INTERNALS__' in window
  )
}

export function detectarRuntimeTauri(): boolean {
  return estaNoAppJiffyFlow()
}

/**
 * @deprecated Não é identidade. O .exe é `JiffyFlow/` no User-Agent.
 * Preview no Chrome é só `?gestor`. Não gravar cookie nem storage.
 */
export function persistirSinalKioskFlow(): void {
  /* identidade não vive em storage */
}

/** @deprecated Sempre false — não usar storage como se fosse o .exe. */
export function lerSinalKioskFlowPersistido(): boolean {
  return false
}

function pathSemQuery(pathModulo: string): string {
  return pathModulo.split('?')[0] || ''
}

export function isRotaPedidos(pathModulo: string): boolean {
  const path = pathSemQuery(pathModulo)
  return path === PEDIDOS_PATH || path.startsWith(`${PEDIDOS_PATH}/`)
}

export function isRotaWhatsAppFlow(pathModulo: string): boolean {
  return pathSemQuery(pathModulo) === PEDIDOS_WHATSAPP_PATH
}

const PREFIXOS_CONTA_NO_FLOW = [
  '/login',
  '/registro',
  '/confirmar-email',
  '/esqueci-senha',
  '/redefinir-senha',
] as const

/** Rotas que o .exe pode mostrar. Qualquer outra (hub, dashboard, ERP) é o Gestor web. */
export function isRotaPermitidaNoJiffyFlow(pathname: string): boolean {
  const path = stripGestaoEmpresaSlugFromPath(pathSemQuery(pathname))
  if (isRotaPedidos(path)) return true
  return PREFIXOS_CONTA_NO_FLOW.some(r => path === r || path.startsWith(`${r}/`))
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

/** Quadro / lista no Flow: path `/pedidos` + app (`JiffyFlow/`) ou `?gestor`. */
export function isRotaKioskPedidos(pathname: string, search = ''): boolean {
  const path = stripGestaoEmpresaSlugFromPath(pathname)
  /** Rotas só do casco: nunca o hub web de Minhas Empresas. */
  if (path === `${PEDIDOS_PATH}/empresas` || path === PEDIDOS_WHATSAPP_PATH) {
    return true
  }
  if (!isRotaPedidos(path)) return false
  const hasTauri = typeof window !== 'undefined' && detectarRuntimeTauri()
  return isSinalKioskGestorPedidos({ hasTauri, search })
}

/** Quadro / lista de empresas no casco Windows / `?gestor` (não o ERP web). */
export function isQuadroKioskAtual(): boolean {
  if (typeof window === 'undefined') return false
  return isRotaKioskPedidos(window.location.pathname, window.location.search)
}
