import type { Auth } from '@/src/domain/entities/Auth'
import type { LoginEmpresaSnapshot } from '@/src/domain/types/LoginEmpresaSnapshot'
import type { ConvitePendente } from '@/src/presentation/components/features/convites/types'
import { conviteParaEmpresaSnapshot } from '@/src/presentation/components/features/convites/utils/conviteParaEmpresaSnapshot'
import { loginViaApiRoute } from '@/src/presentation/components/features/auth/utils/loginViaApiRoute'

export type ExecutarPosRegistroConviteOptions = {
  loginWithHubEmpresas: (auth: Auth, empresas: LoginEmpresaSnapshot[] | null) => void
  setHubEmpresas: (empresas: LoginEmpresaSnapshot[] | null) => void
  getHubEmpresas: () => LoginEmpresaSnapshot[] | null
  onPrecisaConfirmarEmail: () => void
  onConcluido: () => void
}

/**
 * Após `POST /api/auth/usuario/registro-por-convite` no fluxo de convite: login silencioso, `GET /convites/me`, `POST .../aceitar`.
 * Se o backend ainda exigir confirmação de e-mail, delega a `onPrecisaConfirmarEmail`.
 */
export async function executarPosRegistroConvite(
  email: string,
  password: string,
  options: ExecutarPosRegistroConviteOptions
): Promise<void> {
  const { loginWithHubEmpresas, setHubEmpresas, getHubEmpresas, onPrecisaConfirmarEmail, onConcluido } =
    options

  const resultado = await loginViaApiRoute(email, password)
  if (!resultado.ok) {
    if (resultado.needsEmailConfirmation) {
      onPrecisaConfirmarEmail()
      return
    }
    throw new Error(resultado.error)
  }

  loginWithHubEmpresas(resultado.auth, resultado.empresas)

  const token = resultado.auth.getAccessToken()
  const res = await fetch('/api/convites/me', {
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const lista = await res.json().catch(() => null)
  if (!res.ok || !Array.isArray(lista) || lista.length === 0) {
    onConcluido()
    return
  }

  const convites = lista as ConvitePendente[]
  const em = email.trim().toLowerCase()
  const convite =
    convites.find(c => c.email.trim().toLowerCase() === em) ?? convites[0]

  const aceitarRes = await fetch(`/api/convites/me/${encodeURIComponent(convite.id)}/aceitar`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (aceitarRes.ok) {
    const snapshot = conviteParaEmpresaSnapshot(convite)
    const atual = getHubEmpresas() ?? []
    if (!atual.some(e => e.id === snapshot.id)) {
      setHubEmpresas([...atual, snapshot])
    }
  }

  onConcluido()
}
