/**
 * Renova o JWT da empresa via BFF (`POST /api/auth/refresh-token`).
 * Envia `empresaId` da aba para o BFF usar **somente** o refresh do mapa.
 * Sem `empresaId` (hub), o BFF usa o cookie legado last-wins.
 */

import { getTabEmpresaId } from '@/src/shared/utils/tabSession'

let inFlight: Promise<string | null> | null = null
let inFlightEmpresaId: string | null | undefined

async function doFetch(empresaId: string | null): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empresaId ? { empresaId } : {}),
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

/** Chamadas simultâneas da mesma empresa partilham a mesma promise. */
export function fetchTenantRefreshAccessToken(): Promise<string | null> {
  const empresaId = (() => {
    try {
      return getTabEmpresaId()
    } catch {
      return null
    }
  })()

  if (inFlight && inFlightEmpresaId === empresaId) {
    return inFlight
  }

  inFlightEmpresaId = empresaId
  inFlight = doFetch(empresaId).finally(() => {
    inFlight = null
    inFlightEmpresaId = undefined
  })
  return inFlight
}
