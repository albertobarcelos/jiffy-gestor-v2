import type { QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { SESSION_STORAGE_TENANT_LOGOUT_SELF } from '@/src/shared/constants/sessionCoordinator'
import { HUB_PATH } from '@/src/shared/constants/hubRoutes'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { restoreIdentityFromCookie } from '@/src/presentation/utils/restoreIdentityFromCookie'

type DisconnectOpts = {
  queryClient: QueryClient
  logoutTenant: () => Promise<void>
  /** Logout completo (hub + empresa). Usado se a identidade do portal não puder ser recuperada. */
  logout?: () => Promise<void>
}

/**
 * Logout só da empresa: limpa cache + tenant state e volta ao portal (Meu Jiffy).
 *
 * Fluxo:
 *  1. Marca `TENANT_LOGOUT_SELF` (fica até o hub carregar) → AuthGuard não faz logout completo.
 *  2. Garante identidade do hub (Zustand ou cookie `identity-token`).
 *  3. Regrava cookie de identidade se o JWT do hub ainda for válido.
 *  4. Limpa React Query e chama logoutTenant (sessionStorage + Zustand).
 *  5. Navega para {@link HUB_PATH} — ou `/login` se o portal não tiver sessão recuperável.
 */
export async function disconnectEmpresaTab({
  queryClient,
  logoutTenant,
  logout,
}: DisconnectOpts): Promise<void> {
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_LOGOUT_SELF, '1')
  } catch {
    /* noop */
  }

  const identityOk = await restoreIdentityFromCookie()
  if (!identityOk) {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
    } catch {
      /* noop */
    }
    toast.error('Sessão do Meu Jiffy expirou. Faça login novamente.', {
      id: 'meu-jiffy-sessao-expirada',
      duration: 6000,
    })
    try {
      queryClient.clear()
      if (logout) {
        await logout()
      } else {
        await useAuthStore.getState().logout()
      }
    } catch (e) {
      console.error('disconnectEmpresaTab: logout completo', e)
    }
    window.location.assign('/login')
    return
  }

  const identity = useAuthStore.getState().identityAuth
  if (identity && !identity.isExpired()) {
    try {
      await fetch('/api/auth/sync-identity-cookie', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: identity.getAccessToken() }),
      })
    } catch (e) {
      console.error('disconnectEmpresaTab: sync identity cookie', e)
    }
  }

  try {
    queryClient.clear()
    await logoutTenant()
  } catch (e) {
    console.error('disconnectEmpresaTab:', e)
  }

  window.location.assign(HUB_PATH)
}
