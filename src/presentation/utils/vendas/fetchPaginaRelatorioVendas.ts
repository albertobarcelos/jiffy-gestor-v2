import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import type { VendasUnificadasResponse } from '@/src/application/dto/VendaUnificadaDTO'
import {
  fetchPedidosDeliveryPagina,
  vendasUnificadasQueryParamsParaPedidosDelivery,
} from '@/src/presentation/components/features/kanban/hooks/usePedidosDeliveryInfinite'
import { fetchVendasUnificadasPagina } from '@/src/presentation/components/features/kanban/hooks/useVendasUnificadas'
import { filtrosVendasParaParamsUnificados } from './vendasListQuery'
import type { VendasFiltrosQuerySnapshot } from './vendasListTypes'

export function filtroTipoVendaEhEntregaOuRetirada(
  tipoVendaFilter: string | null
): 'entrega' | 'retirada' | null {
  const raw = String(tipoVendaFilter ?? '')
    .trim()
    .toLowerCase()
  if (raw === 'entrega' || raw === 'retirada') return raw
  return null
}

function statusDeliveryDoRelatorio(
  statusFilter: string | null
): StatusDeliveryApi | StatusDeliveryApi[] | undefined {
  const n = statusFilter?.toUpperCase()
  if (n === 'CANCELADA') return 'CANCELADO'
  if (n === 'FINALIZADA') return 'FINALIZADO'
  if (n === 'ABERTA') return ['PENDENTE', 'EM_PREPARO', 'PRONTO', 'EM_ROTA']
  return ['FINALIZADO', 'CANCELADO']
}

/** Entrega/retirada vêm do módulo delivery; o restante do relatório usa o unificado. */
export async function fetchPaginaRelatorioVendas(
  filters: VendasFiltrosQuerySnapshot,
  offset: number,
  limit: number,
  token: string,
  args?: { timeZoneEmpresa?: string; signal?: AbortSignal }
): Promise<VendasUnificadasResponse> {
  const paramsUnificados = filtrosVendasParaParamsUnificados(filters, {
    timeZoneEmpresa: args?.timeZoneEmpresa,
  })
  const atendimento = filtroTipoVendaEhEntregaOuRetirada(filters.tipoVendaFilter)

  if (atendimento) {
    const deliveryParams = vendasUnificadasQueryParamsParaPedidosDelivery({
      ...paramsUnificados,
      tipo: 'DELIVERY',
      tipoEntrega: atendimento,
      tipoVenda: undefined,
    })
    const page = await fetchPedidosDeliveryPagina(
      {
        ...deliveryParams,
        tipoEntrega: atendimento,
        statusDelivery: statusDeliveryDoRelatorio(filters.statusFilter),
        cancelado: null,
      },
      offset,
      limit,
      token,
      args?.signal
    )
    return {
      items: page.items,
      count: page.count,
      page: page.page,
      limit: page.limit,
      totalPages: page.totalPages,
      hasNext: page.hasNext,
      hasPrevious: page.hasPrevious,
    }
  }

  return fetchVendasUnificadasPagina(
    paramsUnificados,
    offset,
    limit,
    token,
    args?.signal
  )
}

const MAPA_TIPO_ENTREGA_PAGE_SIZE = 100

/**
 * O GET unificado não expõe `tipoEntrega`. O módulo delivery sim.
 * Mapa id → entrega|retirada do mesmo período, para rotular a lista mista.
 */
export async function carregarMapaTipoEntregaDelivery(input: {
  filters: VendasFiltrosQuerySnapshot
  token: string
  timeZoneEmpresa?: string
  signal?: AbortSignal
}): Promise<Map<string, 'entrega' | 'retirada'>> {
  const { filters, token, timeZoneEmpresa, signal } = input
  const paramsUnificados = filtrosVendasParaParamsUnificados(filters, { timeZoneEmpresa })
  const deliveryParams = vendasUnificadasQueryParamsParaPedidosDelivery({
    ...paramsUnificados,
    tipo: 'DELIVERY',
    tipoEntrega: undefined,
    tipoVenda: undefined,
  })

  const mapa = new Map<string, 'entrega' | 'retirada'>()
  let offset = 0
  let total: number | null = null

  for (;;) {
    if (signal?.aborted) break
    const page = await fetchPedidosDeliveryPagina(
      {
        ...deliveryParams,
        statusDelivery: statusDeliveryDoRelatorio(filters.statusFilter),
        cancelado: null,
      },
      offset,
      MAPA_TIPO_ENTREGA_PAGE_SIZE,
      token,
      signal
    )
    if (typeof page.count === 'number') total = page.count

    for (const item of page.items) {
      const tipo = item.tipoAtendimento()
      if (!tipo) continue
      mapa.set(item.id, tipo)
      const codigo = String(item.codigoVenda ?? '').trim()
      if (codigo) mapa.set(codigo, tipo)
    }

    if (page.items.length === 0) break
    offset += page.items.length
    if (page.items.length < MAPA_TIPO_ENTREGA_PAGE_SIZE) break
    if (total != null && offset >= total) break
  }

  return mapa
}
