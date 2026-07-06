import { getOrFetchImpressorasIdsDoProduto } from '@/src/infrastructure/api/produtoImpressorasSessionCache'

async function fetchImpressorasIdsDoProdutoFromApi(
  produtoId: string,
  accessToken: string | undefined
): Promise<string[]> {
  const id = produtoId.trim()
  if (!id || !accessToken?.trim()) return []

  const res = await fetch(`/api/produtos/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) return []

  const data = (await res.json()) as Record<string, unknown>
  const impressoras = data.impressoras
  if (!Array.isArray(impressoras)) return []

  const ids: string[] = []
  for (const imp of impressoras) {
    if (!imp || typeof imp !== 'object') continue
    const rid = (imp as Record<string, unknown>).id
    if (rid != null && String(rid).trim() !== '') ids.push(String(rid).trim())
  }
  return ids
}

/**
 * IDs das impressoras lógicas do produto (`GET /api/produtos/:id` → `impressoras[]`).
 * Usa **cache de sessão** + deduplicação de requisições em paralelo (mesmo modelo mental do POS:
 * cardálogo em cache; a venda só traz `produtoId` na linha).
 */
export function fetchImpressorasIdsDoProduto(
  produtoId: string,
  accessToken: string | undefined
): Promise<string[]> {
  return getOrFetchImpressorasIdsDoProduto(produtoId, () =>
    fetchImpressorasIdsDoProdutoFromApi(produtoId, accessToken)
  )
}
