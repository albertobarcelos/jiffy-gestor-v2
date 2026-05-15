/**
 * Renova o JWT da empresa via BFF (`POST /api/auth/refresh-token`), usando o
 * cookie httpOnly `refresh-token` gravado em `escolher-empresa`.
 *
 * Não renova o JWT de identidade do hub — esse fluxo não persiste refresh de hub no app.
 */

let inFlight: Promise<string | null> | null = null

async function doFetch(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      return null
    }
    const data = (await res.json().catch(() => ({}))) as { accessToken?: string }
    const accessToken = data.accessToken
    return typeof accessToken === 'string' && accessToken.length > 0 ? accessToken : null
  } catch {
    return null
  }
}

/** Chamadas simultâneas partilham a mesma promise (poll + efeito). */
export function fetchTenantRefreshAccessToken(): Promise<string | null> {
  if (!inFlight) {
    inFlight = doFetch().finally(() => {
      inFlight = null
    })
  }
  return inFlight
}
