import type { QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { SESSION_STORAGE_TENANT_LOGOUT_SELF } from '@/src/shared/constants/sessionCoordinator'
import { isSinalKioskGestorPedidos } from '@/src/presentation/gestor-pedidos/isKioskGestorPedidos'
import {
  lerSinalGestorDoBrowser,
  urlHubDaSessaoAtual,
  urlLoginDaSessaoAtual,
} from '@/src/presentation/gestor-pedidos/pathsGestorSessao'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { ensureHubBearerToken } from '@/src/presentation/utils/ensureHubBearerToken'
import { restoreIdentityFromCookie } from '@/src/presentation/utils/restoreIdentityFromCookie'

type DisconnectOpts = {
  queryClient: QueryClient
  logoutTenant: () => Promise<void>
  /** Logout completo (hub + empresa). Só se não houver identity nem refresh. */
  logout?: () => Promise<void>
}

/**
 * Sai da empresa nesta aba e volta ao Meu Jiffy.
 *
 * Não exige identity: se o refresh cookie ainda valer, o hub sobe com access.
 * Não apaga o refresh (logout-tenant só limpa tenant-token).
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

  await restoreIdentityFromCookie()
  const hubBearer = await ensureHubBearerToken()

  if (!hubBearer) {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_TENANT_LOGOUT_SELF)
    } catch {
      /* noop */
    }
    toast.error('Sessão expirada. Faça login novamente.', {
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
    window.location.assign(urlLoginDaSessaoAtual())
    return
  }

  if (hubBearer.source === 'identity') {
    try {
      await fetch('/api/auth/sync-identity-cookie', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: hubBearer.token }),
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

  window.location.assign(
    isSinalKioskGestorPedidos(lerSinalGestorDoBrowser())
      ? urlLoginDaSessaoAtual()
      : urlHubDaSessaoAtual()
  )
}
