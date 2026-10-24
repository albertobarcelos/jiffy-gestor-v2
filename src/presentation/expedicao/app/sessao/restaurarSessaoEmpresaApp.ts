import type { UltimaEmpresaAppEntregador } from '@/src/application/expedicao/app/ultimaEmpresaAppEntregador'
import { decidirRestaurarSessaoEmpresaApp } from '@/src/application/expedicao/app/ultimaEmpresaAppEntregador'
import { User } from '@/src/domain/entities/User'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { entrarEmpresaExpedicaoNaAba } from '@/src/presentation/expedicao/sessao/entrarEmpresaExpedicaoNaAba'
import { fetchAccessTokenEscolherEmpresa } from '@/src/presentation/utils/escolherEmpresaApi'
import { restoreIdentityFromCookie } from '@/src/presentation/utils/restoreIdentityFromCookie'
import { fetchTenantRefreshAccessToken } from '@/src/shared/utils/fetchTenantRefreshAccessToken'
import { extractTokenInfo } from '@/src/shared/utils/validateToken'
import { isEmailSessaoPlaceholder } from '@/src/shared/utils/buildAuthFromAccessToken'
import { lerUltimaEmpresaApp } from './ultimaEmpresaAppStorage'

export { decidirRestaurarSessaoEmpresaApp }

export function lerDecisaoRestaurarSessaoEmpresaApp() {
  const tenant = useAuthStore.getState().tenantAuth
  const identity = useAuthStore.getState().identityAuth
  return decidirRestaurarSessaoEmpresaApp({
    tenantValido: Boolean(tenant && !tenant.isExpired()),
    identityValida: Boolean(identity && !identity.isExpired()),
    ultima: lerUltimaEmpresaApp(),
    userIdAtual: identity?.getUser().getId() ?? useAuthStore.getState().hubEmpresasUserId,
  })
}

function tokenDaMesmaEmpresa(accessToken: string, empresaId: string): boolean {
  const tokenEmpresaId = extractTokenInfo(accessToken).empresaId
  return !tokenEmpresaId || tokenEmpresaId === empresaId
}

async function obterAccessTokenEmpresaApp(empresaId: string): Promise<string | null> {
  const refreshed = await fetchTenantRefreshAccessToken(empresaId)
  if (refreshed && tokenDaMesmaEmpresa(refreshed, empresaId)) return refreshed
  const identity = useAuthStore.getState().identityAuth
  if (!identity || identity.isExpired()) return null
  try {
    const token = await fetchAccessTokenEscolherEmpresa(empresaId, identity.getAccessToken())
    return tokenDaMesmaEmpresa(token, empresaId) ? token : null
  } catch {
    return null
  }
}

function usuarioParaRestaurarApp(ultima: UltimaEmpresaAppEntregador): User | undefined {
  const atual = useAuthStore.getState().getUser()
  if (atual && !isEmailSessaoPlaceholder(atual.getEmail())) return atual
  const email = ultima.userEmail?.trim() ?? ''
  if (!ultima.userId || isEmailSessaoPlaceholder(email)) return undefined
  return User.create(ultima.userId, email, ultima.userName)
}

export async function executarRestaurarSessaoEmpresaApp(
  ultima: UltimaEmpresaAppEntregador
): Promise<boolean> {
  const identity = useAuthStore.getState().identityAuth
  if (!identity || identity.isExpired()) {
    await restoreIdentityFromCookie()
  }
  const token = await obterAccessTokenEmpresaApp(ultima.empresaId)
  if (!token) return false
  try {
    entrarEmpresaExpedicaoNaAba({
      accessToken: token,
      empresaNome: ultima.empresaNome,
      empresaId: ultima.empresaId,
      superficie: 'app',
      usuario: usuarioParaRestaurarApp(ultima),
    })
    return true
  } catch {
    return false
  }
}
