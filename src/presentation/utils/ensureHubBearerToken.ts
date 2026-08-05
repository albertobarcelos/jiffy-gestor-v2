import { useAuthStore } from '@/src/presentation/stores/authStore'
import { getTabTenantToken } from '@/src/shared/utils/tabSession'
import { isTokenExpired } from '@/src/shared/utils/validateToken'
import { fetchTenantRefreshAccessToken } from '@/src/shared/utils/fetchTenantRefreshAccessToken'
import { restoreIdentityFromCookie } from '@/src/presentation/utils/restoreIdentityFromCookie'
import { syncTenantAccessTokenClient } from '@/src/presentation/utils/syncTenantAccessTokenClient'

export type HubBearerSource = 'identity' | 'access'

export type HubBearer = {
  token: string
  source: HubBearerSource
}

/**
 * Resolve o Bearer do hub (Meu Jiffy) em qualquer aba.
 *
 * Ordem (docs/arquitetura-jiffy/5.presentation/4.FLUXO_VOLTAR_AO_MEU_JIFFY.md):
 * 1. identity válido (Zustand ou cookie)
 * 2. access da aba (tenantAuth / sessionStorage)
 * 3. mint via refresh (mapa por empresa se houver `empresaId`; senão cookie legado hub)
 * 4. null → login
 */
export async function ensureHubBearerToken(): Promise<HubBearer | null> {
  const fromIdentity = (): HubBearer | null => {
    const identity = useAuthStore.getState().identityAuth
    if (identity && !identity.isExpired()) {
      return { token: identity.getAccessToken(), source: 'identity' }
    }
    return null
  }

  const hit = fromIdentity()
  if (hit) {
    return hit
  }

  const restored = await restoreIdentityFromCookie()
  if (restored) {
    const afterRestore = fromIdentity()
    if (afterRestore) {
      return afterRestore
    }
  }

  const tenant = useAuthStore.getState().tenantAuth
  if (tenant && !tenant.isExpired()) {
    return { token: tenant.getAccessToken(), source: 'access' }
  }

  const tabToken = getTabTenantToken()
  if (tabToken && !isTokenExpired(tabToken)) {
    return { token: tabToken, source: 'access' }
  }

  const refreshed = await fetchTenantRefreshAccessToken()
  if (refreshed && !isTokenExpired(refreshed)) {
    // Só grava na aba se não trocar de empresa (refresh cookie é global / last-wins).
    // No hub sem tenant, sincroniza; no ERP de outra empresa, só devolve o Bearer.
    syncTenantAccessTokenClient(refreshed)
    return { token: refreshed, source: 'access' }
  }

  return null
}
