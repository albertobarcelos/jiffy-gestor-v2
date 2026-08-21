import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import { decodeToken } from '@/src/shared/utils/validateToken'

type FallbackUser = { id: string; email: string; name?: string }

/** E-mail fictício antigo — sessão inválida; nunca deve ser persistido. */
export const EMAIL_SESSAO_PLACEHOLDER = 'usuario@sessao.local'

export function isEmailSessaoPlaceholder(email: string | null | undefined): boolean {
  if (!email) return true
  const e = email.trim().toLowerCase()
  return !e.includes('@') || e.endsWith('@sessao.local') || e === EMAIL_SESSAO_PLACEHOLDER
}

export class AuthSessionUserIncompleteError extends Error {
  constructor(message = 'Sessão sem e-mail de usuário válido') {
    super(message)
    this.name = 'AuthSessionUserIncompleteError'
  }
}

/**
 * Monta sessão Auth a partir do JWT (login / escolher-empresa / refresh).
 * Identity e access **não** trazem e-mail no payload — exige `fallbackUser.email`
 * real (vindo do login ou de GET /usuarios/me). Sem e-mail válido → erro (deslogar).
 */
export function buildAuthFromAccessToken(
  accessToken: string,
  fallbackUser?: FallbackUser
): Auth {
  const decoded = decodeToken(accessToken)
  const expiresAt =
    decoded?.exp != null ? new Date(decoded.exp * 1000) : new Date(Date.now() + 86_400_000)

  const userId = String(decoded?.userId ?? decoded?.sub ?? fallbackUser?.id ?? '').trim()
  if (!userId || userId === 'unknown') {
    throw new AuthSessionUserIncompleteError('Sessão sem userId válido')
  }

  const rawEmail = decoded?.email ?? fallbackUser?.email
  const email =
    typeof rawEmail === 'string' && rawEmail.includes('@') ? rawEmail.trim() : ''

  if (isEmailSessaoPlaceholder(email)) {
    throw new AuthSessionUserIncompleteError(
      'Sessão sem e-mail de usuário. Faça login novamente.'
    )
  }

  const nameFromToken =
    typeof decoded?.name === 'string'
      ? decoded.name
      : typeof decoded?.nome === 'string'
        ? decoded.nome
        : fallbackUser?.name

  const user = User.create(userId, email, nameFromToken)
  return Auth.createWithExpiration(accessToken, user, expiresAt)
}
