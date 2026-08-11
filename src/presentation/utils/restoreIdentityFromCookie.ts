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

    const prevUser = current?.getUser()
    const restored = buildAuthFromAccessToken(
      accessToken,
      prevUser
        ? {
            id: prevUser.getId(),
            email: prevUser.getEmail(),
            name: prevUser.getName(),
          }
        : undefined
    )
    if (restored.isExpired()) {
      return false
    }

    useAuthStore.setState(state => {
      const newUserId = restored.getUser().getId()
      let { hubEmpresas, hubEmpresasUserId } = state
      // Continuity: cookie restore pode mudar o claim de id vs o user do login;
      // se a lista era do mesmo dono (ou identity anterior), reatribui o owner.
      if (
        hubEmpresas &&
        hubEmpresas.length > 0 &&
        hubEmpresasUserId &&
        hubEmpresasUserId !== newUserId
      ) {
        const prevId = prevUser?.getId()
        if (!prevId || prevId === hubEmpresasUserId || prevId === newUserId) {
          hubEmpresasUserId = newUserId
        }
      }
      return {
        identityAuth: restored,
        auth: state.tenantAuth ?? restored,
        hubEmpresas,
        hubEmpresasUserId,
        isAuthenticated: true,
        error: null,
      }
    })
    return true
  } catch (e) {
    console.error('restoreIdentityFromCookie:', e)
    return false
  }
}
