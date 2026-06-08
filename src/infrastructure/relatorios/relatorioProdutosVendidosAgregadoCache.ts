import type { ExecRelatorioProdutosVendidosInput, ExecRelatorioProdutosVendidosResult } from '@/src/infrastructure/relatorios/montarRelatorioProdutosVendidos'
import type {
  ProdutoRankingAnteriorDTO,
  RelatorioProdutosVendidosMvpMockFlags,
  RelatorioProdutosVendidosMvpSerieDiaDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'

/** TTL curto: evita repetir centenas de GET de venda ao paginar a lista (offset > 0). */
const CACHE_TTL_MS = 90_000

export type RelatorioAgregadoCacheEntry = {
  expiresAt: number
  atual: ExecRelatorioProdutosVendidosResult
  anterior: ExecRelatorioProdutosVendidosResult | null
  omitirComparativo: boolean
  /** Período anterior já agregado (ou omitido de forma definitiva). */
  comparativoPronto: boolean
  mockFlags: RelatorioProdutosVendidosMvpMockFlags
  serieTemporal: RelatorioProdutosVendidosMvpSerieDiaDTO[]
  rankingCompleto: ProdutoRankingAnteriorDTO[]
}

type GlobalCache = typeof globalThis & {
  __jiffyRelatorioProdutosAgregadoCache?: Map<string, RelatorioAgregadoCacheEntry>
  __jiffyRelatorioAgregadoInflight?: Map<string, Promise<RelatorioAgregadoCacheEntry>>
}

function getStore(): Map<string, RelatorioAgregadoCacheEntry> {
  const g = globalThis as GlobalCache
  if (!g.__jiffyRelatorioProdutosAgregadoCache) {
    g.__jiffyRelatorioProdutosAgregadoCache = new Map()
  }
  return g.__jiffyRelatorioProdutosAgregadoCache
}

export type RelatorioAgregadoCacheKeyInput = {
  empresaId: string
  paramsIntervaloPdV: URLSearchParams
  sort: string
  grupoIdsKey: string
  valorMin: number | null
  valorMax: number | null
  qtdMin: number | null
  qtdMax: number | null
  qBusca: string | null
  timezone: string
}

export function buildRelatorioAgregadoCacheKey(input: RelatorioAgregadoCacheKeyInput): string {
  const intervalo = input.paramsIntervaloPdV.toString()
  return [
    input.empresaId,
    input.timezone,
    intervalo,
    input.sort,
    input.grupoIdsKey,
    input.valorMin ?? '',
    input.valorMax ?? '',
    input.qtdMin ?? '',
    input.qtdMax ?? '',
    input.qBusca ?? '',
  ].join('|')
}

export function getRelatorioAgregadoCache(key: string): RelatorioAgregadoCacheEntry | null {
  const store = getStore()
  const hit = store.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    store.delete(key)
    return null
  }
  return hit
}

export function setRelatorioAgregadoCache(key: string, entry: Omit<RelatorioAgregadoCacheEntry, 'expiresAt'>): void {
  const store = getStore()
  store.set(key, { ...entry, expiresAt: Date.now() + CACHE_TTL_MS })
  if (store.size > 40) {
    const now = Date.now()
    for (const [k, v] of store) {
      if (now > v.expiresAt) store.delete(k)
    }
  }
}

/**
 * Evita corridas: várias requisições (página 0 + página 1 em paralelo) não devem
 * gravar agregações parciais diferentes no cache.
 */
export function obterRelatorioAgregadoComSingleFlight(
  key: string,
  factory: () => Promise<RelatorioAgregadoCacheEntry>
): Promise<RelatorioAgregadoCacheEntry> {
  const hit = getRelatorioAgregadoCache(key)
  if (hit) return Promise.resolve(hit)

  const g = globalThis as GlobalCache
  if (!g.__jiffyRelatorioAgregadoInflight) {
    g.__jiffyRelatorioAgregadoInflight = new Map()
  }

  const existente = g.__jiffyRelatorioAgregadoInflight.get(key)
  if (existente) return existente

  const promessa = factory().finally(() => {
    g.__jiffyRelatorioAgregadoInflight?.delete(key)
  })
  g.__jiffyRelatorioAgregadoInflight.set(key, promessa)
  return promessa
}

export type PipelineOptsForCache = Omit<ExecRelatorioProdutosVendidosInput, 'limit' | 'offset'>
