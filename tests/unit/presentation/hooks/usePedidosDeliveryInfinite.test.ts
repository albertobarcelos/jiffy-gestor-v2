import { describe, expect, it } from 'vitest'
import {
  getNextOffsetPedidosDelivery,
  vendasUnificadasQueryParamsParaPedidosDelivery,
  type PedidosDeliveryInfinitePage,
} from '@/features/kanban/hooks/usePedidosDeliveryInfinite'
import { VendaUnificadaDTO } from '@/features/kanban/hooks/useVendasUnificadas'

function criarDto(id: string): VendaUnificadaDTO {
  return new VendaUnificadaDTO(
    id,
    1,
    'V0001',
    'entrega',
    'GESTOR',
    'venda_gestor',
    50,
    0,
    0,
    '2026-06-15T10:00:00.000Z',
    null,
    null,
    null,
    false,
    null,
    null,
    { id: '', nome: '—' }
  )
}

function pagina(
  ids: string[],
  opts: Partial<PedidosDeliveryInfinitePage> = {}
): PedidosDeliveryInfinitePage {
  return {
    items: ids.map(criarDto),
    count: opts.count ?? ids.length,
    page: opts.page ?? 1,
    limit: opts.limit ?? 50,
    totalPages: opts.totalPages ?? 1,
    hasNext: opts.hasNext ?? false,
    hasPrevious: opts.hasPrevious ?? false,
  }
}

describe('vendasUnificadasQueryParamsParaPedidosDelivery', () => {
  it('mapeia origem e datas para filtros delivery', () => {
    expect(
      vendasUnificadasQueryParamsParaPedidosDelivery({
        q: 'maria',
        origem: 'DELIVERY',
        dataCriacaoInicial: '2026-06-01T00:00:00.000Z',
        dataFinalizacaoInicio: '2026-06-02T00:00:00.000Z',
      })
    ).toEqual({
      q: 'maria',
      origemFiltroKanban: 'DELIVERY',
      dataCriacaoInicial: '2026-06-01T00:00:00.000Z',
      dataCriacaoFinal: undefined,
      dataFinalizacaoInicio: '2026-06-02T00:00:00.000Z',
      dataFinalizacaoFim: undefined,
    })
  })
})

describe('getNextOffsetPedidosDelivery', () => {
  it('retorna próximo offset quando há mais páginas', () => {
    const p1 = pagina(['a', 'b'], { count: 4, hasNext: true })
    const next = getNextOffsetPedidosDelivery(p1, [p1])
    expect(next).toBe(2)
  })

  it('para quando não há itens novos (página duplicada)', () => {
    const p1 = pagina(['a'], { count: 2, hasNext: true })
    const p2 = pagina(['a'], { count: 2, hasNext: true })
    expect(getNextOffsetPedidosDelivery(p2, [p1, p2])).toBeUndefined()
  })
})
