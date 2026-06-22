/**
 * Resolve nome da impressora cadastrada no Gestor (nome usado no QZ Tray no Windows).
 * BFF: GET `/api/impressoras/:id` → backend `/api/v1/preferencias/impressoras/:id`.
 */
export async function fetchNomeImpressoraPorId(
  impressoraId: string,
  accessToken: string | undefined
): Promise<string | null> {
  const id = impressoraId.trim()
  if (!id || !accessToken?.trim()) return null

  const res = await fetch(`/api/impressoras/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) return null

  const data = (await res.json()) as Record<string, unknown> | null
  if (!data || typeof data !== 'object') return null
  const nome = typeof data.nome === 'string' ? data.nome.trim() : ''
  return nome.length > 0 ? nome : null
}
