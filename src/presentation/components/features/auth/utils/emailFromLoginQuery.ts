import { decodeInvitePayloadFromLoginSearch } from '@/src/presentation/components/features/auth/utils/inviteLoginPayload'

/**
 * Extrai `email` da query da página de login.
 * Trata clientes de e-mail que quebram o href (encoding extra ou `&` mal escapado).
 */
export function extrairEmailLoginQuery(search: string): string | null {
  const semInterrogacao = search.startsWith('?') ? search.slice(1) : search
  if (!semInterrogacao.trim()) {
    return null
  }

  const tentar = (q: string): string | null => {
    try {
      const sp = new URLSearchParams(q)
      const d = decodeInvitePayloadFromLoginSearch(sp)
      if (d?.email?.trim()) {
        return d.email.trim()
      }
      const v = sp.get('email')
      return v && v.trim() ? decodeURIComponentSafe(v.trim()) : null
    } catch {
      return null
    }
  }

  let email = tentar(semInterrogacao)
  if (email) {
    return email
  }

  let decoded = semInterrogacao
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
      email = tentar(decoded)
      if (email) return email
    } catch {
      break
    }
  }

  return null
}

function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
