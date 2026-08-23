import { Superficie } from '@/src/domain/superficie/Superficie'

/** Destino do operador de pedidos. */
export const PATH_GESTOR_PEDIDOS = '/pedidos'
export const PATH_DASHBOARD_ERP = '/dashboard'

const PREFIXOS_PUBLICOS = [
  '/login',
  '/registro',
  '/confirmar-email',
  '/esqueci-senha',
  '/redefinir-senha',
  '/notas-fiscais',
] as const

/** Hub e identidade: o operador precisa escolher empresa antes do portal. */
const PREFIXOS_SESSAO = ['/minhas-empresas', '/perfil', '/hub', '/convites-gestor'] as const

export function normalizarPathModulo(path: string): string {
  const semQuery = String(path ?? '').split('?')[0]
  const trimmed = semQuery.replace(/\/+$/, '')
  if (!trimmed || trimmed === '') return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function coincidePrefixo(path: string, prefixo: string): boolean {
  return path === prefixo || path.startsWith(`${prefixo}/`)
}

export function isRotaPublicaAuth(path: string): boolean {
  const normalizado = normalizarPathModulo(path)
  return PREFIXOS_PUBLICOS.some(prefixo => coincidePrefixo(normalizado, prefixo))
}

export function isRotaSessaoHub(path: string): boolean {
  const normalizado = normalizarPathModulo(path)
  return PREFIXOS_SESSAO.some(prefixo => coincidePrefixo(normalizado, prefixo))
}

export function isRotaPortalPedidos(path: string): boolean {
  return coincidePrefixo(normalizarPathModulo(path), PATH_GESTOR_PEDIDOS)
}

export class RotasDaSuperficie {
  static pathPermitido(superficie: Superficie, path: string): boolean {
    const normalizado = normalizarPathModulo(path)
    if (isRotaPublicaAuth(normalizado) || isRotaSessaoHub(normalizado)) {
      return true
    }
    if (isRotaPortalPedidos(normalizado)) {
      return true
    }
    if (superficie.isPortalPedidos()) {
      return false
    }
    return superficie.isErp()
  }

  static destinoSeNegado(superficie: Superficie): string {
    return superficie.isPortalPedidos() ? PATH_GESTOR_PEDIDOS : PATH_DASHBOARD_ERP
  }
}
