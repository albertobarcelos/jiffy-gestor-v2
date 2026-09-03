import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'
import { escolherEmpresaUnicaAtiva } from './escolherEmpresaUnicaAtiva'
import { isSinalKioskGestorPedidos } from '../kiosk/isKioskGestorPedidos'
import { pathEscolherEmpresaKiosk } from './pathsGestorSessao'

export type DestinoAposLogin =
  | { tipo: 'hub'; path: string }
  | { tipo: 'pedidos-gestor'; empresa: LoginEmpresaSnapshot }
  | { tipo: 'escolher-empresa-kiosk'; path: string }

export function planearDestinoAposLogin(input: {
  empresas: readonly LoginEmpresaSnapshot[] | null | undefined
  sinalGestor: { hasTauri: boolean; search?: string }
  ultimaEmpresaId?: string | null
}): DestinoAposLogin {
  if (!isSinalKioskGestorPedidos(input.sinalGestor)) {
    return { tipo: 'hub', path: HUB_PATH }
  }

  const unica = escolherEmpresaUnicaAtiva(input.empresas)
  if (unica) {
    return { tipo: 'pedidos-gestor', empresa: unica }
  }

  /** Várias empresas: sempre a lista. A última só destaca o item; não salta o ecrã. */
  return { tipo: 'escolher-empresa-kiosk', path: pathEscolherEmpresaKiosk() }
}
