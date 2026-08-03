import { buildAuthFromAccessToken } from '@/src/shared/utils/buildAuthFromAccessToken'
import { useAuthStore } from '@/src/presentation/stores/authStore'

/**
 * Garante `identityAuth` válido no Zustand.
 * Se a memória perdeu o JWT do hub mas o cookie `identity-token` ainda vale,
 * reidrata a sessão sem exigir novo login.
 */
export async function restoreIdentityFromCookie(): Promise<boolean> {
  const current = useAuthStore.getState().identityAuth
  if (current && !current.isExpired()) {
    return true
  }

  try {
    const res = await fetch('/api/auth/identity-session', {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      return false
    }

    const data = (await res.json().catch(() => null)) as { accessToken?: unknown } | null
    const accessToken = typeof data?.accessToken === 'string' ? data.accessToken.trim() : ''
    if (!accessToken) {
      return false
    }

    const restored = buildAuthFromAccessToken(accessToken)
    if (restored.isExpired()) {
      return false
    }

    useAuthStore.setState(state => ({
      identityAuth: restored,
      auth: state.tenantAuth ?? restored,
      isAuthenticated: true,
      error: null,
    }))
    return true
  } catch (e) {
    console.error('restoreIdentityFromCookie:', e)
    return false
  }
}
