export type InviteLoginPayloadV1 = {
  v: 1
  email: string
  nu?: boolean
  cid?: string
}

/**
 * Gmail (e outros) às vezes codificam o `=` entre nome e valor como `%3D`.
 * O parser então não vê um `=` literal: após decode, a **chave** vira `p=<base64>` inteira e `get('p')` falha.
 */
export function extrairTokenQueryParamP(search: string): string | null {
  const q = search.startsWith('?') ? search.slice(1) : search
  if (!q.trim()) {
    return null
  }

  try {
    const sp = new URLSearchParams(q)
    const direto = sp.get('p')
    if (direto?.trim()) {
      return direto.trim()
    }
    for (const [key] of sp.entries()) {
      const m = /^p=(.+)$/.exec(key)
      if (m?.[1]?.trim()) {
        return m[1].trim()
      }
    }
  } catch {
    /* regex abaixo */
  }

  const bruto = q.match(/(?:^|[&])p(?:%25)+3D([^&]*)/i) ?? q.match(/(?:^|[&])p%3D([^&]*)/i)
  if (bruto?.[1]?.trim()) {
    try {
      return decodeURIComponent(bruto[1].trim())
    } catch {
      return bruto[1].trim()
    }
  }

  const literal = q.match(/(?:^|[&])p=([^&]*)/)
  if (literal?.[1]?.trim()) {
    return literal[1].trim()
  }

  return null
}

export function extrairTokenQueryParamPFromSearchParams(sp: URLSearchParams): string | null {
  const direto = sp.get('p')
  if (direto?.trim()) {
    return direto.trim()
  }
  for (const [key] of sp.entries()) {
    const m = /^p=(.+)$/.exec(key)
    if (m?.[1]?.trim()) {
      return m[1].trim()
    }
  }
  return extrairTokenQueryParamP(`?${sp.toString()}`)
}

export function decodeInvitePayloadFromLoginSearch(
  spOrQuery: URLSearchParams | string
): InviteLoginPayloadV1 | null {
  const token =
    typeof spOrQuery === 'string'
      ? extrairTokenQueryParamP(spOrQuery)
      : extrairTokenQueryParamPFromSearchParams(spOrQuery)
  if (!token?.trim()) {
    return null
  }
  let cur = token.trim()
  for (let i = 0; i < 3; i++) {
    const dec = decodeInviteLoginPayload(cur)
    if (dec) {
      return dec
    }
    try {
      const next = decodeURIComponent(cur)
      if (next === cur) {
        break
      }
      cur = next
    } catch {
      break
    }
  }
  return null
}

/**
 * Convite “novo usuário”: monta query de `/registro` ou `null` se deve ficar em `/login`.
 * Usada no middleware para redirecionar antes de renderizar a página de login.
 */
export function queryRegistroConviteNovoUsuarioFromLoginSearch(
  search: string
): URLSearchParams | null {
  if (!search || search === '?') {
    return null
  }

  const payload = decodeInvitePayloadFromLoginSearch(search)

  let sp: URLSearchParams
  try {
    sp = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  } catch {
    sp = new URLSearchParams()
  }

  const novousuarioLegacy = sp.get('novousuario') === 'true'
  const emailLegacy = sp.get('email')

  const ir =
    payload?.nu === true ||
    (novousuarioLegacy && Boolean(emailLegacy?.trim()))

  if (!ir) {
    return null
  }

  const q = new URLSearchParams()
  const email = payload?.email?.trim() || emailLegacy?.trim() || ''
  if (email) {
    q.set('email', email)
  }
  const cid = payload?.cid ?? sp.get('conviteId')
  if (cid?.trim()) {
    q.set('conviteId', cid.trim())
  }
  q.set('fluxo', 'convite')
  return q
}

function decodeBase64Url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function decodeInviteLoginPayload(p: string): InviteLoginPayloadV1 | null {
  try {
    const json = decodeBase64Url(p.trim())
    const o = JSON.parse(json) as InviteLoginPayloadV1
    if (o?.v !== 1 || typeof o.email !== 'string' || !o.email.trim()) return null
    return o
  } catch {
    return null
  }
}
