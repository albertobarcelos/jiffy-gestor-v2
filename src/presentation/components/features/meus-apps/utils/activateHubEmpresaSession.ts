import { useAuthStore } from '@/src/presentation/stores/authStore'
import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import { bootstrapTabSessionManually, buildEmpresaUrlParam } from '@/src/shared/utils/tabSession'
import { empresaNomeParaSlugUrl } from '@/src/shared/utils/empresaNomeParaSlugUrl'

type HubEmpresaSubRoute = '/meus-apps/gerenciar-usuarios' | '/meus-apps/perfis-gestor'

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
  bootstrapTabSessionManually(accessToken, empParam)

  const prev = useAuthStore.getState().getUser()
  const auth = buildAuthFromAccessToken(
    accessToken,
    prev ? { id: prev.getId(), email: prev.getEmail(), name: prev.getName() } : undefined
  )
  useAuthStore.getState().setTenantAuth(auth)

  const slug = empresaNomeParaSlugUrl(empresaNome)
  return `${subRoute}/${slug}?${empParam}`
}
