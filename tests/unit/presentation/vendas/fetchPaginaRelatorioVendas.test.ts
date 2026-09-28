import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  carregarMapaTipoEntregaDelivery,
  fetchPaginaRelatorioVendas,
} from '@/src/presentation/utils/vendas/fetchPaginaRelatorioVendas'
import type { VendasFiltrosQuerySnapshot } from '@/src/presentation/utils/vendas/vendasListTypes'

const fetchVendasUnificadasPagina = vi.hoisted(() => vi.fn())
const fetchPedidosDeliveryPagina = vi.hoisted(() => vi.fn())

vi.mock('@/src/presentation/components/features/kanban/hooks/useVendasUnificadas', () => ({
  fetchVendasUnificadasPagina,
}))

vi.mock('@/src/presentation/components/features/kanban/hooks/usePedidosDeliveryInfinite', () => ({
  fetchPedidosDeliveryPagina,
  vendasUnificadasQueryParamsParaPedidosDelivery: (params: Record<string, unknown>) => ({
    tipoEntrega: params.tipoEntrega,
    dataFinalizacaoInicio: params.dataFinalizacaoInicio,
    dataFinalizacaoFim: params.dataFinalizacaoFim,
  }),
}))

function filtros(partial: Partial<VendasFiltrosQuerySnapshot> = {}): VendasFiltrosQuerySnapshot {
  return {
    searchQuery: '',
    valorMinimo: '',
    valorMaximo: '',
    periodo: 'Todos',
    statusFilter: null,
    tipoVendaFilter: null,
    meioPagamentoFilter: '',
    usuarioAbertoPorFilter: '',
    terminalFilter: '',
    usuarioCancelouFilter: '',
    periodoInicial: null,
    periodoFinal: null,
    ...partial,
  }
}

const paginaVazia = {
  items: [],
  count: 0,
  page: 1,
  limit: 100,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
}

describe('fetchPaginaRelatorioVendas', () => {
  beforeEach(() => {
    fetchVendasUnificadasPagina.mockReset().mockResolvedValue(paginaVazia)
    fetchPedidosDeliveryPagina.mockReset().mockResolvedValue(paginaVazia)
  })

  it('usa a API delivery para entrega e retirada', async () => {
    await fetchPaginaRelatorioVendas(filtros({ tipoVendaFilter: 'retirada' }), 0, 100, 't')
    expect(fetchPedidosDeliveryPagina).toHaveBeenCalledTimes(1)
    expect(fetchVendasUnificadasPagina).not.toHaveBeenCalled()
    expect(fetchPedidosDeliveryPagina.mock.calls[0][0]).toMatchObject({
      tipoEntrega: 'retirada',
      cancelado: null,
    })
  })

  it('usa o unificado para os demais tipos', async () => {
    await fetchPaginaRelatorioVendas(filtros({ tipoVendaFilter: 'balcao' }), 0, 100, 't')
    expect(fetchVendasUnificadasPagina).toHaveBeenCalledTimes(1)
    expect(fetchPedidosDeliveryPagina).not.toHaveBeenCalled()
  })
})

describe('carregarMapaTipoEntregaDelivery', () => {
  beforeEach(() => {
    fetchPedidosDeliveryPagina.mockReset()
  })

  it('indexa id e codigoVenda com o tipo real do delivery', async () => {
    fetchPedidosDeliveryPagina.mockResolvedValueOnce({
      items: [
        {
          id: 'gid-1',
          codigoVenda: 'COD-1',
          tipoAtendimento: () => 'retirada',
        },
        {
          id: 'gid-2',
          codigoVenda: 'COD-2',
          tipoAtendimento: () => 'entrega',
        },
      ],
      count: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
    })

    const mapa = await carregarMapaTipoEntregaDelivery({
      filters: filtros(),
      token: 't',
    })

    expect(mapa.get('gid-1')).toBe('retirada')
    expect(mapa.get('COD-1')).toBe('retirada')
    expect(mapa.get('gid-2')).toBe('entrega')
    expect(mapa.get('COD-2')).toBe('entrega')
  })
})
