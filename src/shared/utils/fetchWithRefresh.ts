/**
 * Wrapper de `fetch` que tenta renovar o access token via refresh token
 * quando a API retorna 401, antes de falhar definitivamente.
 *
 * Inclui mutex para evitar múltiplas renovações simultâneas.
 */

let refreshPromise: Promise<string | null> | null = null

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      return null
    }
    const data = (await res.json()) as { accessToken?: string }
    return data.accessToken ?? null
  } catch {
    return null
  }
}

/**
 * Tenta renovar o access token. Múltiplas chamadas simultâneas compartilham
 * a mesma promise para evitar race conditions e requests duplicados.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export type FetchWithRefreshOptions = RequestInit & {
  /** Se `false`, não tenta refresh em 401. Default: `true`. */
  autoRefresh?: boolean
}

/**
 * Executa `fetch` e, ao receber 401, tenta renovar o token e repetir a
 * requisição **uma vez**. Se a renovação falhar, retorna a resposta 401
 * original para que o caller trate (ex: redirect para login).
 */
export async function fetchWithRefresh(
  input: RequestInfo | URL,
  init?: FetchWithRefreshOptions
): Promise<Response> {
  const { autoRefresh = true, ...fetchInit } = init ?? {}

  const response = await fetch(input, fetchInit)

  if (response.status !== 401 || !autoRefresh) {
    return response
  }

  const newToken = await refreshAccessToken()
  if (!newToken) {
    return response
  }

  const retryHeaders = new Headers(fetchInit.headers)
  retryHeaders.set('Authorization', `Bearer ${newToken}`)

  return fetch(input, { ...fetchInit, headers: retryHeaders })
}
