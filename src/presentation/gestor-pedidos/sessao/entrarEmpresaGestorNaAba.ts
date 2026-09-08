import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  buildAuthFromAccessToken,
  isEmailSessaoPlaceholder,
} from '@/src/shared/utils/buildAuthFromAccessToken'
import { bootstrapTabSessionManually, buildEmpresaUrlParam } from '@/src/shared/utils/tabSession'
import { lerSinalGestorDoBrowser, pathPedidosGestor } from './pathsGestorSessao'
import { isSinalKioskGestorPedidos } from '../kiosk/isKioskGestorPedidos'
import { gravarUltimaEmpresaKiosk } from '../kiosk/ultimaEmpresaKiosk'

/** Ativa a empresa nesta aba e devolve `/gestao/{slug}/pedidos?gestor`. */
export function entrarEmpresaGestorNaAba(input: {
  accessToken: string
  empresaNome: string
  empresaId: string
}): string {
  const empParam = buildEmpresaUrlParam(input.empresaNome, input.empresaId)
  bootstrapTabSessionManually(input.accessToken, empParam, input.empresaId)

  const prev = useAuthStore.getState().getUser()
  if (!prev || isEmailSessaoPlaceholder(prev.getEmail())) {
    throw new Error('Sessão sem usuário válido. Faça login novamente.')
  }

  const auth = buildAuthFromAccessToken(input.accessToken, {
    id: prev.getId(),
    email: prev.getEmail(),
    name: prev.getName(),
  })
  useAuthStore.getState().setTenantAuth(auth)
  useAuthStore.getState().setTabVerified(true)

  if (isSinalKioskGestorPedidos(lerSinalGestorDoBrowser())) {
    const userId =
      useAuthStore.getState().identityAuth?.getUser().getId() ??
      useAuthStore.getState().hubEmpresasUserId ??
      prev.getId()
    gravarUltimaEmpresaKiosk({
      userId,
      empresaId: input.empresaId,
      empParam,
    })
  }

  return pathPedidosGestor(empParam)
}
