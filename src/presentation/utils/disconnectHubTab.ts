import { SESSION_STORAGE_HUB_LOGOUT_SELF } from '@/src/shared/constants/sessionCoordinator'

type DisconnectHubOpts = {
  logoutHub: () => Promise<void>
}

/**
 * Logout do hub (identidade): remove cookie + estado; sincroniza outras guias via persist.
 * Nesta guia tenta `window.close()`; se o browser não fechar, fallback `/login`.
 */
export async function disconnectHubTab({ logoutHub }: DisconnectHubOpts): Promise<void> {
  try {
    sessionStorage.setItem(SESSION_STORAGE_HUB_LOGOUT_SELF, '1')
  } catch {
    /* noop */
  }

  try {
    await logoutHub()
  } catch (e) {
    console.error('disconnectHubTab:', e)
  }

  try {
    window.close()
  } catch {
    /* noop */
  }

  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_HUB_LOGOUT_SELF)
    } catch {
      /* noop */
    }
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      window.location.assign('/login')
    }
  }, 250)
}
