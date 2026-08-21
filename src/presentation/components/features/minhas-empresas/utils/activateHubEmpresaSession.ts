import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  buildAuthFromAccessToken,
  isEmailSessaoPlaceholder,
} from '@/src/shared/utils/buildAuthFromAccessToken'
import { bootstrapTabSessionManually, buildEmpresaUrlParam } from '@/src/shared/utils/tabSession'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'
import type { HubEmpresaSubRoute } from '@/src/shared/constants/hubRoutes'

/**
 * Ativa sessão tenant na aba atual (sem `window.open`) e devolve a URL do sub-módulo hub.
 */
export function activateHubEmpresaSessionAndBuildUrl(
  accessToken: string,
  empresaNome: string,
  empresaId: string,
  subRoute: HubEmpresaSubRoute
): string {
  const empParam = buildEmpresaUrlParam(empresaNome, empresaId)
  bootstrapTabSessionManually(accessToken, empParam, empresaId)

  const prev = useAuthStore.getState().getUser()
  if (!prev || isEmailSessaoPlaceholder(prev.getEmail())) {
    throw new Error('Sessão sem usuário válido. Faça login novamente.')
  }
  const auth = buildAuthFromAccessToken(accessToken, {
    id: prev.getId(),
    email: prev.getEmail(),
    name: prev.getName(),
  })
  useAuthStore.getState().setTenantAuth(auth)
  useAuthStore.getState().setTabVerified(true)

  const slug = empresaNomeParaSlugUrl(empresaNome)
  return `${subRoute}/${slug}?${empParam}`
}
