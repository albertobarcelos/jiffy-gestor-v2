import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'
import { escolherEmpresaUnicaAtiva } from './escolherEmpresaUnicaAtiva'
import { isSinalKioskGestorPedidos } from './isKioskGestorPedidos'
import { pathHubComSinalGestor } from './pathsGestorSessao'

export type DestinoAposLogin =
  | { tipo: 'hub'; path: string }
  | { tipo: 'pedidos-gestor'; empresa: LoginEmpresaSnapshot }

export function planearDestinoAposLogin(input: {
  empresas: readonly LoginEmpresaSnapshot[] | null | undefined
  sinalGestor: { hasTauri: boolean; search?: string }
}): DestinoAposLogin {
  if (!isSinalKioskGestorPedidos(input.sinalGestor)) {
    return { tipo: 'hub', path: HUB_PATH }
  }

  const unica = escolherEmpresaUnicaAtiva(input.empresas)
  if (unica) {
    return { tipo: 'pedidos-gestor', empresa: unica }
  }

  return { tipo: 'hub', path: pathHubComSinalGestor(input.sinalGestor) }
}
