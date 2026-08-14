import {
  AuthSessionUserIncompleteError,
  buildAuthFromAccessToken,
  isEmailSessaoPlaceholder,
} from '@/src/shared/utils/buildAuthFromAccessToken'
import { useAuthStore } from '@/src/presentation/stores/authStore'

type UsuarioMePayload = {
  id?: unknown
  username?: unknown
  email?: unknown
  nome?: unknown
  name?: unknown
}

async function fetchUsuarioMeFallback(accessToken: string): Promise<{
  id: string
  email: string
  name?: string
} | null> {
  try {
    const res = await fetch('/api/auth/usuario/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!res.ok) return null
    const data = (await res.json().catch(() => null)) as UsuarioMePayload | null
    if (!data) return null

    const id = typeof data.id === 'string' ? data.id.trim() : ''
    const emailRaw =
      (typeof data.username === 'string' && data.username) ||
      (typeof data.email === 'string' && data.email) ||
      ''
    const email = emailRaw.trim()
    if (!id || isEmailSessaoPlaceholder(email)) return null

    const name =
      (typeof data.nome === 'string' && data.nome.trim()) ||
      (typeof data.name === 'string' && data.name.trim()) ||
      undefined

    return { id, email, ...(name ? { name } : {}) }
  } catch {
    return null
  }
}

/**
 * Garante `identityAuth` válido no Zustand.
 * Se a memória perdeu o JWT do hub mas o cookie `identity-token` ainda vale,
 * reidrata a sessão sem exigir novo login.
 * Sem e-mail real (JWT não traz e-mail) busca GET /usuarios/me; se falhar → false (deslogar).
 */
export async function restoreIdentityFromCookie(): Promise<boolean> {
  const current = useAuthStore.getState().identityAuth
  if (current && !current.isExpired()) {
    const email = current.getUser().getEmail()
    if (!isEmailSessaoPlaceholder(email)) {
      return true
    }
    // Identity em memória com placeholder inválido → força reidratar ou falhar
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
    let fallback =
      prevUser && !isEmailSessaoPlaceholder(prevUser.getEmail())
        ? {
            id: prevUser.getId(),
            email: prevUser.getEmail(),
            name: prevUser.getName(),
          }
        : undefined

    let restored
    try {
      restored = buildAuthFromAccessToken(accessToken, fallback)
    } catch (err) {
      if (!(err instanceof AuthSessionUserIncompleteError)) {
        throw err
      }
      // JWT sem e-mail: busca perfil global
      const fromApi = await fetchUsuarioMeFallback(accessToken)
      if (!fromApi) {
        return false
      }
      restored = buildAuthFromAccessToken(accessToken, fromApi)
    }

    if (restored.isExpired()) {
      return false
    }

    useAuthStore.setState(state => {
      const newUserId = restored.getUser().getId()
      let { hubEmpresas, hubEmpresasUserId } = state
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
    if (e instanceof AuthSessionUserIncompleteError) {
      console.error('restoreIdentityFromCookie: usuário incompleto', e.message)
      return false
    }
    console.error('restoreIdentityFromCookie:', e)
    return false
  }
}
