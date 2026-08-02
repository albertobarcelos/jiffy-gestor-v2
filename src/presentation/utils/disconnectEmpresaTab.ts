import type { QueryClient } from '@tanstack/react-query'
import { SESSION_STORAGE_TENANT_LOGOUT_SELF } from '@/src/shared/constants/sessionCoordinator'
import { useAuthStore } from '@/src/presentation/stores/authStore'

type DisconnectOpts = {
  queryClient: QueryClient
  logoutTenant: () => Promise<void>
}

/**
 * Logout só da empresa: limpa cache + tenant state e volta ao portal de aplicativos.
 *
 * Fluxo:
 *  1. Marca `TENANT_LOGOUT_SELF` (fica até o hub carregar) → AuthGuard não faz logout completo.
 *  2. Regrava cookie de identidade se o JWT do hub ainda for válido no Zustand.
 *  3. Limpa React Query e chama logoutTenant (sessionStorage + Zustand).
 *  4. Navega sempre para `/meus-apps` (sem remover o flag antes — evita race → /login).
 */
export async function disconnectEmpresaTab({ queryClient, logoutTenant }: DisconnectOpts): Promise<void> {
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_LOGOUT_SELF, '1')
  } catch {
    /* noop */
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

  window.location.assign('/meus-apps')
}
