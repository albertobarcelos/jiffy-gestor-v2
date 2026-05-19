import { Auth } from '@/src/domain/entities/Auth'
import { User } from '@/src/domain/entities/User'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import { parseEmpresasLogin } from '@/src/presentation/components/features/auth/utils/parseLoginEmpresas'

export type LoginViaApiRouteResult =
  | { ok: true; auth: Auth; empresas: LoginEmpresaSnapshot[] | null }
  | { ok: false; error: string; needsEmailConfirmation: boolean }

/**
 * Mesmo contrato de `POST /api/auth/login` usado pelo {@link LoginForm}.
 */
export async function loginViaApiRoute(
  username: string,
  password: string
): Promise<LoginViaApiRouteResult> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username.trim(),
      password,
    }),
  })

  const data = await response.json()

  if (!response.ok || !data.success) {
    const errMsg = typeof data.error === 'string' ? data.error : ''
    const needsEmailConfirmation =
      /e-mail\s+n[aã]o\s+confirm|email\s+n[aã]o\s+confirm|e-?mail\s+n[aã]o\s+confirmad|conta\s+n[aã]o\s+confirmad|pendente\s+de\s+confirma|confirme\s+seu\s+e-?mail|confirmar\s+seu\s+e-?mail|verifique\s+sua\s+caixa/i.test(
        errMsg
      )
    return {
      ok: false,
      error: errMsg || 'Erro ao fazer login',
      needsEmailConfirmation,
    }
  }

  const authData = data.data

  const user = User.create(authData.user.id, authData.user.email, authData.user.name)

  const expiresAt = new Date(authData.expiresAt)
  const auth = Auth.createWithExpiration(authData.accessToken, user, expiresAt)

  const empresasRaw = data.data?.empresas as unknown
  const empresas =
    empresasRaw === undefined ? null : parseEmpresasLogin(empresasRaw) ?? null

  return { ok: true, auth, empresas }
}
