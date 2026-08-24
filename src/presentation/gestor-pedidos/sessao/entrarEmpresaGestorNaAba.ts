import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  buildAuthFromAccessToken,
  isEmailSessaoPlaceholder,
} from '@/src/shared/utils/buildAuthFromAccessToken'
import { bootstrapTabSessionManually, buildEmpresaUrlParam } from '@/src/shared/utils/tabSession'
import { pathPedidosGestor } from './pathsGestorSessao'

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

  return pathPedidosGestor(empParam)
}
