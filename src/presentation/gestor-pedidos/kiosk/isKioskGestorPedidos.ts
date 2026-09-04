import { stripGestaoEmpresaSlugFromPath } from '@/src/shared/utils/gestaoRoutes'
import {
  PATH_BOLHA_HTML,
  PEDIDOS_PATH,
  PEDIDOS_WHATSAPP_PATH,
  QUERY_GESTOR,
  TOKEN_USER_AGENT_FREDY,
  TOKEN_USER_AGENT_JIFFY_FLOW,
} from '../constantes'

export function pedidoVeioDoAppJiffyFlow(userAgent: string | null | undefined): boolean {
  const ua = String(userAgent ?? '')
  return ua.includes(TOKEN_USER_AGENT_FREDY) || ua.includes(TOKEN_USER_AGENT_JIFFY_FLOW)
}

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

export function isRotaPermitidaNoJiffyFlow(pathname: string): boolean {
  const path = stripGestaoEmpresaSlugFromPath(pathSemQuery(pathname))
  if (path === PATH_BOLHA_HTML) return true
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

export function isRotaCascoFlowExclusivo(pathModulo: string): boolean {
  const path = stripGestaoEmpresaSlugFromPath(pathSemQuery(pathModulo))
  return path === `${PEDIDOS_PATH}/empresas` || path === PEDIDOS_WHATSAPP_PATH
}

export function deveEsconderTopNavNoGestorPedidos(
  pathModulo: string,
  sinal: { hasTauri: boolean; search?: string }
): boolean {
  const path = stripGestaoEmpresaSlugFromPath(pathModulo)
  if (isRotaCascoFlowExclusivo(path)) return true
  if (!isRotaPedidos(path)) return false
  return isSinalKioskGestorPedidos(sinal)
}

export function sinalKioskNesteBrowser(): { hasTauri: boolean; search: string } {
  if (typeof window === 'undefined') return { hasTauri: false, search: '' }
  return { hasTauri: estaNoAppJiffyFlow(), search: window.location.search }
}

export function kioskNesteBrowser(pathname: string | null): boolean {
  return deveEsconderTopNavNoGestorPedidos(
    stripGestaoEmpresaSlugFromPath(pathname ?? ''),
    sinalKioskNesteBrowser()
  )
}

export function isRotaKioskPedidos(pathname: string, search = ''): boolean {
  const hasTauri = typeof window !== 'undefined' && estaNoAppJiffyFlow()
  return deveEsconderTopNavNoGestorPedidos(pathname, { hasTauri, search })
}

export function isQuadroKioskAtual(): boolean {
  if (typeof window === 'undefined') return false
  return isRotaKioskPedidos(window.location.pathname, window.location.search)
}

/**
 * SSR de `/pedidos*` não vê UA/`?gestor`. Até hidratar, o casco trata como kiosk
 * para o TopNav do ERP não piscar.
 */
export function chromeErpCasco(input: {
  kiosk: boolean
  rotaPedidos: boolean
  clientePronto: boolean
}): { layoutKiosk: boolean; mostrarTopNav: boolean } {
  return {
    layoutKiosk: input.kiosk || (input.rotaPedidos && !input.clientePronto),
    mostrarTopNav: !input.kiosk && (input.clientePronto || !input.rotaPedidos),
  }
}
