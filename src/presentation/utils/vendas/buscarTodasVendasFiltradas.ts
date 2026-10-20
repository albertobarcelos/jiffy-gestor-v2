import {
  carregarMapaTipoEntregaDelivery,
  fetchPaginaRelatorioVendas,
  filtroTipoVendaEhEntregaOuRetirada,
} from './fetchPaginaRelatorioVendas'
import {
  agregarMetricasVendasLista,
  mapearEFiltrarVendasUnificadas,
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

export async function buscarTodasVendasFiltradas(input: {
  filters: VendasFiltrosQuerySnapshot
  token: string
  timeZoneEmpresa: string
  onProgress?: (carregadas: number, total: number | null) => void
}): Promise<BuscarTodasVendasResult> {
  const { filters, token, timeZoneEmpresa, onProgress } = input
  const tipoEntregaPorId =
    filtroTipoVendaEhEntregaOuRetirada(filters.tipoVendaFilter) == null
      ? await carregarMapaTipoEntregaDelivery({ filters, token, timeZoneEmpresa })
      : undefined

  let offset = 0
  let totalBackend: number | null = null
  const acumulado: VendaListItem[] = []

  for (;;) {
    const page = await fetchPaginaRelatorioVendas(filters, offset, EXPORT_VENDAS_PAGE_SIZE, token, {
      timeZoneEmpresa,
    })
    if (typeof page.count === 'number') {
      totalBackend = page.count
    }

    const filtered = mapearEFiltrarVendasUnificadas(page.items, filters, tipoEntregaPorId)
    acumulado.push(...filtered)

    onProgress?.(acumulado.length, totalBackend)

    if (acumulado.length > MAX_VENDAS_EXPORT) {
      throw new Error(
        `Período com mais de ${MAX_VENDAS_EXPORT.toLocaleString('pt-BR')} vendas. Reduza o intervalo para exportar.`
      )
    }

    if (page.items.length < EXPORT_VENDAS_PAGE_SIZE) {
      break
    }

    offset += page.items.length

    if (totalBackend != null && offset >= totalBackend) {
      break
    }
  }

  return {
    vendas: acumulado,
    metricas: agregarMetricasVendasLista(acumulado),
    totalBackend,
  }
}
