import type { ApiClient } from '@/src/infrastructure/api/apiClient'
import type { LinhaComplementoVendidoInterna } from '@/src/infrastructure/relatorios/agregarComplementosVendidos'

type GlobalCache = typeof globalThis & {
  __jiffyGrupoComplementoNomeCache?: Map<string, string>
}

async function fetchWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let idx = 0
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < items.length) {
      const current = idx++
      results[current] = await handler(items[current])
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * Preenche `grupoNome` via GET de grupos-complementos (cache em processo).
 */
export async function enriquecerNomesGruposComplemento(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  linhas: LinhaComplementoVendidoInterna[]
  concurrency?: number
}): Promise<LinhaComplementoVendidoInterna[]> {
  const { apiClient, headers, linhas, concurrency = 12 } = args
  const g = globalThis as GlobalCache
  const cache =
    g.__jiffyGrupoComplementoNomeCache ??
    (g.__jiffyGrupoComplementoNomeCache = new Map<string, string>())

  const ids = [
    ...new Set(
      linhas
        .map(l => l.grupoComplementoId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]

  await fetchWithConcurrency(ids, concurrency, async id => {
    if (cache.has(id)) return
    try {
      const resp = await apiClient.request<{ nome?: string }>(
        `/api/v1/cardapio/grupos-complementos/${id}`,
        { method: 'GET', headers }
      )
      const nome = resp.data?.nome?.trim()
      if (nome) cache.set(id, nome)
    } catch {
      // mantém sem nome
    }
  })

  return linhas.map(l => ({
    ...l,
    grupoNome:
      l.grupoComplementoId && cache.has(l.grupoComplementoId)
        ? cache.get(l.grupoComplementoId)!
        : l.grupoNome,
  }))
}
