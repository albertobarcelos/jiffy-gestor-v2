/**
 * BFF: obtém JWT da empresa. Envia Bearer do hub (identity ou access) quando
 * disponível — necessário se o cookie `identity-token` já expirou.
 */
export async function fetchAccessTokenEscolherEmpresa(
  empresaId: string,
  hubBearerToken?: string | null
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (hubBearerToken) {
    headers.Authorization = `Bearer ${hubBearerToken}`
  }

  const res = await fetch('/api/auth/escolher-empresa', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({ empresaId }),
  })

  const body = (await res.json().catch(() => ({}))) as { error?: string; accessToken?: string }

  if (!res.ok) {
    const err = new Error(
      typeof body.error === 'string' ? body.error : `Erro ${res.status}`
    ) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  if (!body.accessToken) {
    throw new Error('Resposta sem accessToken')
  }

  return body.accessToken
}
