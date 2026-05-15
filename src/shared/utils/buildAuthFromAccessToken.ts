import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import { decodeToken } from '@/src/shared/utils/validateToken'

type FallbackUser = { id: string; email: string; name?: string }

/**
 * Monta sessão Auth a partir do JWT retornado por escolher-empresa / login.
 * Usa claims do token; fallback opcional preserva usuário da sessão anterior (hub).
 */
export function buildAuthFromAccessToken(
  accessToken: string,
  fallbackUser?: FallbackUser
): Auth {
  const decoded = decodeToken(accessToken)
  const expiresAt =
    decoded?.exp != null ? new Date(decoded.exp * 1000) : new Date(Date.now() + 86_400_000)

  const userId = String(decoded?.userId ?? decoded?.sub ?? fallbackUser?.id ?? 'unknown')
  const rawEmail = decoded?.email ?? fallbackUser?.email
  const email =
    typeof rawEmail === 'string' && rawEmail.includes('@')
      ? rawEmail
      : 'usuario@sessao.local'

  const nameFromToken =
    typeof decoded?.name === 'string'
      ? decoded.name
      : typeof decoded?.nome === 'string'
        ? decoded.nome
        : fallbackUser?.name

  const user = User.create(userId, email, nameFromToken)
  return Auth.createWithExpiration(accessToken, user, expiresAt)
}
