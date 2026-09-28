import {
  carregarMapaTipoEntregaDelivery,
  fetchPaginaRelatorioVendas,
  filtroTipoVendaEhEntregaOuRetirada,
} from './fetchPaginaRelatorioVendas'
import {
  METRICAS_VENDAS_VAZIAS,
  acumularMetricasVendasLista,
  mapearEFiltrarVendasUnificadas,
} from './vendasListQuery'
import type { MetricasVendas, VendaListItem, VendasFiltrosQuerySnapshot } from './vendasListTypes'

const METRICAS_PAGE_SIZE = 100

function abortSeCancelado(signal?: AbortSignal): void {
  if (!signal?.aborted) return
  const erro = new Error('Agregação de métricas cancelada')
  erro.name = 'AbortError'
  throw erro
}

/**
 * Soma faturado / finalizadas / canceladas de todo o filtro no unificado.
 * Não guarda a lista — só totais. A primeira página já carregada entra para não refetch.
 */
export async function agregarMetricasVendasUnificadas(input: {
  filters: VendasFiltrosQuerySnapshot
  token: string
  timeZoneEmpresa: string
  paginaInicial?: {
    items: VendaListItem[]
    rawLength: number
    count: number | null
  }
  signal?: AbortSignal
}): Promise<MetricasVendas> {
  const { filters, token, timeZoneEmpresa, paginaInicial, signal } = input
  abortSeCancelado(signal)

  const tipoEntregaPorId =
    filtroTipoVendaEhEntregaOuRetirada(filters.tipoVendaFilter) == null
      ? await carregarMapaTipoEntregaDelivery({
          filters,
          token,
          timeZoneEmpresa,
          signal,
        })
      : undefined

  const idsContabilizados = new Set<string>()
  let metricas = METRICAS_VENDAS_VAZIAS
  if (paginaInicial) {
    metricas = acumularMetricasVendasLista(metricas, paginaInicial.items, idsContabilizados)
  }

  let offset = paginaInicial?.rawLength ?? 0
  let totalBackend = paginaInicial?.count ?? null

  for (;;) {
    abortSeCancelado(signal)
    if (totalBackend != null && offset >= totalBackend) {
      break
    }

    const page = await fetchPaginaRelatorioVendas(filters, offset, METRICAS_PAGE_SIZE, token, {
      timeZoneEmpresa,
      signal,
    })
    if (typeof page.count === 'number') {
      totalBackend = page.count
    }

    if (page.items.length === 0) {
      break
    }

    const filtered = mapearEFiltrarVendasUnificadas(page.items, filters, tipoEntregaPorId)
    metricas = acumularMetricasVendasLista(metricas, filtered, idsContabilizados)

    const offsetAnterior = offset
    offset += page.items.length
    if (offset === offsetAnterior) {
      break
    }
    if (page.items.length < METRICAS_PAGE_SIZE) {
      break
    }
    if (totalBackend != null && offset >= totalBackend) {
      break
    }
  }

  return metricas
}
