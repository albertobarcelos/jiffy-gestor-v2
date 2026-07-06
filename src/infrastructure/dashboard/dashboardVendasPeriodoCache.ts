import type { ApiClient } from '@/src/infrastructure/api/apiClient'
import {
  buscarDetalhesVendasComProdutosLancados,
  listarIdsVendasFinalizadasNoPeriodo,
  type VendaDetalheProdutos,
} from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'

const CACHE_TTL_MS = 90_000

export type VendaDetalheDashboard = VendaDetalheProdutos & Record<string, unknown>

type CacheEntry = {
  expiresAt: number
  detalhes: VendaDetalheDashboard[]
}

type GlobalCache = typeof globalThis & {
  __jiffyDashboardVendasDetalhesCache?: Map<string, CacheEntry>
  __jiffyDashboardVendasDetalhesInflight?: Map<string, Promise<VendaDetalheDashboard[]>>
}

function getStore(): Map<string, CacheEntry> {
  const g = globalThis as GlobalCache
  if (!g.__jiffyDashboardVendasDetalhesCache) {
    g.__jiffyDashboardVendasDetalhesCache = new Map()
  }
  return g.__jiffyDashboardVendasDetalhesCache
}

export function buildDashboardVendasPeriodoCacheKey(input: {
  empresaId: string
  paramsComIntervalo: URLSearchParams
}): string {
  return `${input.empresaId}|${input.paramsComIntervalo.toString()}`
}

/**
 * Lista vendas finalizadas do período e busca o detalhe de cada uma (com cache ~90s).
 * Compartilhado entre `/dashboard/top-produtos` e `/dashboard/top-garcons`.
 */
async function carregarDetalhesVendasFinalizadasPeriodo(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  paramsComIntervalo: URLSearchParams
  cacheKey: string
}): Promise<VendaDetalheDashboard[]> {
  const store = getStore()

  const vendaIds = await listarIdsVendasFinalizadasNoPeriodo({
    apiClient: args.apiClient,
    headers: args.headers,
    paramsComIntervalo: args.paramsComIntervalo,
  })

  if (vendaIds.length === 0) {
    const empty: VendaDetalheDashboard[] = []
    store.set(args.cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, detalhes: empty })
    return empty
  }

  const detalhes = (await buscarDetalhesVendasComProdutosLancados({
    apiClient: args.apiClient,
    headers: args.headers,
    vendaIds,
    concurrency: 20,
  })) as VendaDetalheDashboard[]

  store.set(args.cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, detalhes })

  if (store.size > 30) {
    const now = Date.now()
    for (const [k, v] of store) {
      if (now > v.expiresAt) store.delete(k)
    }
  }

  return detalhes
}

export async function obterDetalhesVendasFinalizadasPeriodo(args: {
  apiClient: ApiClient
  headers: Record<string, string>
  paramsComIntervalo: URLSearchParams
  cacheKey: string
}): Promise<VendaDetalheDashboard[]> {
  const store = getStore()
  const hit = store.get(args.cacheKey)
  if (hit && hit.expiresAt > Date.now()) {
    return hit.detalhes
  }

  const g = globalThis as GlobalCache
  if (!g.__jiffyDashboardVendasDetalhesInflight) {
    g.__jiffyDashboardVendasDetalhesInflight = new Map()
  }
  const inflight = g.__jiffyDashboardVendasDetalhesInflight
  const pending = inflight.get(args.cacheKey)
  if (pending) return pending

  const promise = carregarDetalhesVendasFinalizadasPeriodo(args).finally(() => {
    inflight.delete(args.cacheKey)
  })
  inflight.set(args.cacheKey, promise)
  return promise
}
