import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mapItemJsonParaVendaUnificadaDTO } from '@/src/application/dto/VendaUnificadaDTO'
import { agregarMetricasVendasUnificadas } from '@/src/presentation/utils/vendas/agregarMetricasVendasUnificadas'
import type { VendasFiltrosQuerySnapshot } from '@/src/presentation/utils/vendas/vendasListTypes'

const fetchVendasUnificadasPagina = vi.hoisted(() => vi.fn())

vi.mock('@/src/presentation/components/features/kanban/hooks/useVendasUnificadas', () => ({
  fetchVendasUnificadasPagina,
}))

vi.mock('@/src/presentation/components/features/kanban/hooks/usePedidosDeliveryInfinite', () => ({
  fetchPedidosDeliveryPagina: vi.fn().mockResolvedValue({
    items: [],
    count: 0,
    page: 1,
    limit: 100,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  }),
  vendasUnificadasQueryParamsParaPedidosDelivery: () => ({}),
}))

function filtros(): VendasFiltrosQuerySnapshot {
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
  }
}

function dto(partial: Record<string, unknown>) {
  return mapItemJsonParaVendaUnificadaDTO({
    id: 'v1',
    numeroVenda: 1,
    codigoVenda: 'A1',
    tipoVenda: 'balcao',
    origem: 'PDV',
    tabelaOrigem: 'venda',
    valorFinal: 10,
    dataCriacao: '2026-09-01T10:00:00.000Z',
    dataFinalizacao: '2026-09-01T11:00:00.000Z',
    abertoPor: { id: 'u1', nome: 'Ana' },
    ...partial,
  })
}

describe('agregarMetricasVendasUnificadas', () => {
  beforeEach(() => {
    fetchVendasUnificadasPagina.mockReset()
  })

  it('soma todas as páginas, não só a primeira', async () => {
    fetchVendasUnificadasPagina
      .mockResolvedValueOnce({
        items: [
          dto({ id: 'p2-1', valorFinal: 30 }),
          dto({
            id: 'p2-2',
            valorFinal: 40,
            dataCancelamento: '2026-09-01T12:00:00.000Z',
            dataFinalizacao: null,
          }),
        ],
        count: 3,
        page: 2,
        limit: 100,
        totalPages: 2,
        hasNext: false,
        hasPrevious: true,
      })

    const metricas = await agregarMetricasVendasUnificadas({
      filters: filtros(),
      token: 't',
      timeZoneEmpresa: 'America/Sao_Paulo',
      paginaInicial: {
        items: [
          {
            id: 'p1-1',
            numeroVenda: 1,
            codigoVenda: 'A1',
            valorFinal: 20,
            tipoVenda: 'balcao',
            abertoPorId: 'u1',
            codigoTerminal: '',
            terminalId: '',
            dataCriacao: '2026-09-01T10:00:00.000Z',
            dataFinalizacao: '2026-09-01T11:00:00.000Z',
          },
        ],
        rawLength: 1,
        count: 3,
      },
    })

    expect(metricas.countVendasEfetivadas).toBe(2)
    expect(metricas.countVendasCanceladas).toBe(1)
    expect(metricas.totalFaturado).toBe(50)
    expect(metricas.totalCancelado).toBe(40)
    expect(fetchVendasUnificadasPagina).toHaveBeenCalledTimes(1)
  })
})
