/**
 * Cache em memória (sessão do browser) produtoId → IDs de impressoras.
 *
 * O GET `/gestor/vendas/:id` não inclui impressoras por linha (mesmo padrão do PDV).
 * O POS resolve com cardápio local / PowerSync; no Gestor usamos este cache +
 * pré-carga opcional da lista de produtos ou GET por id para ids em falta.
 */

const impressorasPorProdutoId = new Map<string, string[]>()
const inflight = new Map<string, Promise<string[]>>()

function extrairIdsImpressoras(impressoras: unknown): string[] {
  if (!Array.isArray(impressoras)) return []
  const ids: string[] = []
  for (const imp of impressoras) {
    if (!imp || typeof imp !== 'object') continue
    const rid = (imp as Record<string, unknown>).id
    if (rid != null && String(rid).trim() !== '') ids.push(String(rid).trim())
  }
  return ids
}

export function limparCacheImpressorasProduto(): void {
  impressorasPorProdutoId.clear()
  inflight.clear()
}

/** Injeta entradas a partir do JSON de produto (lista ou detalhe). */
export function registrarImpressorasDoProdutoJson(item: Record<string, unknown>): void {
  const id = item.id != null ? String(item.id).trim() : ''
  if (!id) return
  impressorasPorProdutoId.set(id, extrairIdsImpressoras(item.impressoras))
}

/**
 * Pré-carrega o catálogo paginado (`GET /api/produtos`) e popula o cache.
 * Não bloqueia impressão: pode falhar silenciosamente; ids em falta caem no GET por produto.
 */
export async function prefetchProdutosImpressorasCatalogo(accessToken: string): Promise<void> {
  const limit = 100
  let offset = 0

  try {
    for (;;) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        ativo: 'true',
      })
      const res = await fetch(`/api/produtos?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      })
      if (!res.ok) break

      const data = (await res.json()) as { items?: Record<string, unknown>[] }
      const items = Array.isArray(data.items) ? data.items : []
      if (items.length === 0) break

      for (const item of items) {
        registrarImpressorasDoProdutoJson(item)
      }

      if (items.length < limit) break
      offset += limit
    }
  } catch {
    /* rede / cancelamento — impressão ainda pode usar GET por id */
  }
}

export async function getOrFetchImpressorasIdsDoProduto(
  produtoId: string,
  fetchFromApi: () => Promise<string[]>
): Promise<string[]> {
  const id = produtoId.trim()
  if (!id) return []

  if (impressorasPorProdutoId.has(id)) {
    return impressorasPorProdutoId.get(id)!
  }

  let p = inflight.get(id)
  if (!p) {
    p = fetchFromApi().then(ids => {
      impressorasPorProdutoId.set(id, ids)
      inflight.delete(id)
      return ids
    })
    inflight.set(id, p)
  }
  return p
}
