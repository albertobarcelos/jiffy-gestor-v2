import {
  buildVendasListQueryParams,
  filtrarVendasPorStatusCliente,
  mapearVendaApiRow,
} from './vendasListQuery'
import type { MetricasVendas, VendaListItem, VendasFiltrosQuerySnapshot } from './vendasListTypes'

/** Backend valida `limit` com máximo de 100 (mesmo tamanho da listagem). */
export const EXPORT_VENDAS_PAGE_SIZE = 100
export const MAX_VENDAS_EXPORT = 10_000

interface BuscarTodasVendasResult {
  vendas: VendaListItem[]
  metricas: MetricasVendas | null
  totalBackend: number | null
}

interface PaginaVendasApi {
  items?: unknown[]
  metricas?: MetricasVendas
  count?: number
  totalPages?: number
  limit?: number
}

export async function buscarTodasVendasFiltradas(input: {
  filters: VendasFiltrosQuerySnapshot
  token: string
  timeZoneEmpresa: string
  onProgress?: (carregadas: number, total: number | null) => void
}): Promise<BuscarTodasVendasResult> {
  const { filters, token, timeZoneEmpresa, onProgress } = input
  const baseParams = buildVendasListQueryParams(filters, { timeZoneEmpresa })

  let offset = 0
  let metricas: MetricasVendas | null = null
  let totalBackend: number | null = null
  const acumulado: VendaListItem[] = []

  for (;;) {
    const params = new URLSearchParams(baseParams.toString())
    params.set('limit', String(EXPORT_VENDAS_PAGE_SIZE))
    params.set('offset', String(offset))

    const response = await fetch(`/api/vendas?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as { error?: string }).error || 'Erro ao buscar vendas para exportação'
      )
    }

    const data = (await response.json()) as PaginaVendasApi
    if (offset === 0 && data.metricas) {
      metricas = data.metricas
    }
    if (typeof data.count === 'number') {
      totalBackend = data.count
    }

    const rawItems = data.items ?? []
    const mapped = rawItems.map(item =>
      mapearVendaApiRow(item as Record<string, unknown>)
    )
    const filtered = filtrarVendasPorStatusCliente(mapped, filters.statusFilter)
    acumulado.push(...filtered)

    onProgress?.(acumulado.length, totalBackend)

    if (acumulado.length > MAX_VENDAS_EXPORT) {
      throw new Error(
        `Período com mais de ${MAX_VENDAS_EXPORT.toLocaleString('pt-BR')} vendas. Reduza o intervalo para exportar.`
      )
    }

    if (rawItems.length < EXPORT_VENDAS_PAGE_SIZE) {
      break
    }

    offset += rawItems.length

    if (totalBackend != null && offset >= totalBackend) {
      break
    }
  }

  return { vendas: acumulado, metricas, totalBackend }
}
