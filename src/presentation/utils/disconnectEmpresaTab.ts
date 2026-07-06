import type { QueryClient } from '@tanstack/react-query'
import { SESSION_STORAGE_TENANT_LOGOUT_SELF } from '@/src/shared/constants/sessionCoordinator'

type DisconnectOpts = {
  queryClient: QueryClient
  logoutTenant: () => Promise<void>
}

/**
 * Logout só da empresa: limpa cache + tenant state e volta ao portal de aplicativos.
 *
 * Fluxo:
 *  1. Marca `TENANT_LOGOUT_SELF` → AuthGuard não redireciona enquanto o flag existir.
 *  2. Limpa React Query e chama logoutTenant (sessionStorage + Zustand).
 *  3. Remove o flag e navega sempre para `/meus-apps`.
 */
export async function disconnectEmpresaTab({ queryClient, logoutTenant }: DisconnectOpts): Promise<void> {
  try {
    sessionStorage.setItem(SESSION_STORAGE_TENANT_LOGOUT_SELF, '1')
  } catch {
    /* noop */
  }

  try {
    queryClient.clear()
    await logoutTenant()
  } catch (e) {
    console.error('disconnectEmpresaTab:', e)
  }

  try {
    sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
  } catch {
    /* noop */
  }

  window.location.assign('/meus-apps')
}
