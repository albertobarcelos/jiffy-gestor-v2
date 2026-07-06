/**
 * BFF: obtém JWT da empresa (tenant) usando o cookie httpOnly de identidade (`credentials`).
 * Não envia `Authorization` no header — o cliente costumava mandar o JWT tenant do Zustand
 * por engano e o BFF priorizava esse valor antes do cookie, gerando token inválido no hub.
 */
export async function fetchAccessTokenEscolherEmpresa(empresaId: string): Promise<string> {
  const res = await fetch('/api/auth/escolher-empresa', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ empresaId }),
  })

  const body = (await res.json().catch(() => ({}))) as { error?: string; accessToken?: string }

  if (!res.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `Erro ${res.status}`)
  }
  if (!body.accessToken) {
    throw new Error('Resposta sem accessToken')
  }

  return body.accessToken
}
