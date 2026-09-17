import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import {
  aplicarPedidoDeliveryCriadoNoKanbanCache,
  aplicarPedidoDeliveryStatusAlteradoNoKanbanCache,
  encontrarVendaNasColunasDeliveryKanban,
} from '@/features/kanban/utils/kanbanDeliveryColumnCache'
import type { PedidosDeliveryInfinitePage } from '@/features/kanban/hooks/usePedidosDeliveryInfinite'
import type { InfiniteData } from '@tanstack/react-query'

function paginaVazia(): PedidosDeliveryInfinitePage {
  return {
    items: [],
    count: 0,
    page: 1,
    limit: 15,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
  }
}

function seedColuna(
  queryClient: QueryClient,
  columnId: string,
  items: PedidosDeliveryInfinitePage['items'] = []
): void {
  const data: InfiniteData<PedidosDeliveryInfinitePage> = {
    pages: [{ ...paginaVazia(), items, count: items.length }],
    pageParams: [0],
  }
  queryClient.setQueryData(
    ['tenant', 'emp-1', 'delivery', 'pedidos', 'infinite', 'column', columnId, {}],
    data
  )
}

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ped-rt-1',
    numeroVenda: 99,
    codigoVenda: 'V0099',
    tipoVenda: 'delivery',
    tipoEntrega: 'entrega',
    origem: 'GESTOR',
    statusDelivery: 'PENDENTE',
    valorFinal: 45,
    troco: 0,
    totalPago: 0,
    totalFaltaPagar: 45,
    totalCobrancasCriadas: 0,
    totalCobrancasNaoEfetivadas: 0,
    dataCriacao: '2026-09-15T12:00:00.000Z',
    dataUltimaModificacao: '2026-09-15T12:00:00.000Z',
    cliente: { id: 'cli-1', nome: 'Ana' },
    solicitarEmissaoFiscal: false,
    cobrancas: [],
    observacoes: [],
    ...overrides,
  }
}

describe('aplicarPedidoDeliveryCriadoNoKanbanCache (coluna alvo)', () => {
  it('insere so na coluna NOVOS_PEDIDOS e nao mexe em EM_PREPARO', () => {
    const queryClient = new QueryClient()
    seedColuna(queryClient, 'NOVOS_PEDIDOS')
    seedColuna(queryClient, 'EM_PREPARO')

    expect(aplicarPedidoDeliveryCriadoNoKanbanCache(queryClient, summary())).toBe(true)

    const novos = queryClient.getQueryData<InfiniteData<PedidosDeliveryInfinitePage>>([
      'tenant',
      'emp-1',
      'delivery',
      'pedidos',
      'infinite',
      'column',
      'NOVOS_PEDIDOS',
      {},
    ])
    const preparo = queryClient.getQueryData<InfiniteData<PedidosDeliveryInfinitePage>>([
      'tenant',
      'emp-1',
      'delivery',
      'pedidos',
      'infinite',
      'column',
      'EM_PREPARO',
      {},
    ])

    expect(novos?.pages[0].items.map(i => i.id)).toEqual(['ped-rt-1'])
    expect(preparo?.pages[0].items).toEqual([])
  })

  it('retorna false para payload invalido', () => {
    const queryClient = new QueryClient()
    seedColuna(queryClient, 'NOVOS_PEDIDOS')
    expect(aplicarPedidoDeliveryCriadoNoKanbanCache(queryClient, null)).toBe(false)
  })
})

describe('aplicarPedidoDeliveryStatusAlteradoNoKanbanCache', () => {
  it('move o card de NOVOS_PEDIDOS para EM_PREPARO', () => {
    const queryClient = new QueryClient()
    const cardPendente = (() => {
      seedColuna(queryClient, 'NOVOS_PEDIDOS')
      seedColuna(queryClient, 'EM_PREPARO')
      aplicarPedidoDeliveryCriadoNoKanbanCache(queryClient, summary())
      return encontrarVendaNasColunasDeliveryKanban(queryClient, 'ped-rt-1')
    })()
    expect(cardPendente).not.toBeNull()

    expect(
      aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(
        queryClient,
        summary({ statusDelivery: 'EM_PREPARO', dataInicioPreparo: '2026-09-15T12:05:00.000Z' })
      )
    ).toBe(true)

    const novos = queryClient.getQueryData<InfiniteData<PedidosDeliveryInfinitePage>>([
      'tenant',
      'emp-1',
      'delivery',
      'pedidos',
      'infinite',
      'column',
      'NOVOS_PEDIDOS',
      {},
    ])
    const preparo = queryClient.getQueryData<InfiniteData<PedidosDeliveryInfinitePage>>([
      'tenant',
      'emp-1',
      'delivery',
      'pedidos',
      'infinite',
      'column',
      'EM_PREPARO',
      {},
    ])

    expect(novos?.pages[0].items).toEqual([])
    expect(preparo?.pages[0].items.map(i => i.id)).toEqual(['ped-rt-1'])
  })

  it('remove o card das colunas quando CANCELADO', () => {
    const queryClient = new QueryClient()
    seedColuna(queryClient, 'NOVOS_PEDIDOS')
    aplicarPedidoDeliveryCriadoNoKanbanCache(queryClient, summary())

    expect(
      aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(
        queryClient,
        summary({ statusDelivery: 'CANCELADO' })
      )
    ).toBe(true)
    expect(encontrarVendaNasColunasDeliveryKanban(queryClient, 'ped-rt-1')).toBeNull()
  })

  it('payload fino nao apaga cliente, valor nem tipo do card ja no cache', () => {
    const queryClient = new QueryClient()
    seedColuna(queryClient, 'EM_PREPARO')
    seedColuna(queryClient, 'EM_ROTA')

    expect(
      aplicarPedidoDeliveryCriadoNoKanbanCache(
        queryClient,
        summary({
          statusDelivery: 'EM_PREPARO',
          tipoEntrega: 'retirada',
          valorFinal: 39.9,
          totalFaltaPagar: 39.9,
          totalPago: 0,
          cliente: { id: 'cli-k', nome: 'KLEVERSON JARA' },
          cobrancas: [
            {
              id: 'cob-1',
              status: 'pendente',
              momentoCobranca: 'na_entrega',
              valor: 39.9,
            },
          ],
        })
      )
    ).toBe(true)

    expect(
      aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(queryClient, {
        id: 'ped-rt-1',
        numeroVenda: 99,
        codigoVenda: 'V0099',
        statusDelivery: 'EM_ROTA',
      })
    ).toBe(true)

    const preparo = queryClient.getQueryData<InfiniteData<PedidosDeliveryInfinitePage>>([
      'tenant',
      'emp-1',
      'delivery',
      'pedidos',
      'infinite',
      'column',
      'EM_PREPARO',
      {},
    ])
    const rota = queryClient.getQueryData<InfiniteData<PedidosDeliveryInfinitePage>>([
      'tenant',
      'emp-1',
      'delivery',
      'pedidos',
      'infinite',
      'column',
      'EM_ROTA',
      {},
    ])

    expect(preparo?.pages[0].items).toEqual([])
    const card = rota?.pages[0].items[0]
    expect(card?.id).toBe('ped-rt-1')
    expect(card?.tipoVenda).toBe('retirada')
    expect(card?.valorFinal).toBe(39.9)
    expect(card?.cliente?.nome).toBe('KLEVERSON JARA')
    expect(card?.statusEtapaOperacional).toBe('EM_ROTA')
    expect(String(card?.statusFinanceiro ?? '').toLowerCase()).not.toBe('pago')
  })

  it('summary com tipo e valor mas sem cliente nao apaga o nome ja no cache', () => {
    const queryClient = new QueryClient()
    seedColuna(queryClient, 'EM_PREPARO')
    seedColuna(queryClient, 'PRONTO_ENTREGA')

    expect(
      aplicarPedidoDeliveryCriadoNoKanbanCache(
        queryClient,
        summary({
          statusDelivery: 'EM_PREPARO',
          tipoEntrega: 'entrega',
          valorFinal: 45,
          cliente: { id: 'cli-1', nome: 'Ana' },
        })
      )
    ).toBe(true)

    expect(
      aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(
        queryClient,
        {
          id: 'ped-rt-1',
          numeroVenda: 99,
          codigoVenda: 'V0099',
          statusDelivery: 'PRONTO',
          tipoEntrega: 'entrega',
          valorFinal: 45,
        }
      )
    ).toBe(true)

    const card = encontrarVendaNasColunasDeliveryKanban(queryClient, 'ped-rt-1')
    expect(card?.cliente?.nome).toBe('Ana')
    expect(card?.valorFinal).toBe(45)
    expect(card?.statusEtapaOperacional).toBe('PRONTO')
  })

  it('echo na mesma coluna atualiza o card no lugar sem jogar para o topo', () => {
    const queryClient = new QueryClient()
    seedColuna(queryClient, 'EM_ROTA')
    aplicarPedidoDeliveryCriadoNoKanbanCache(
      queryClient,
      summary({ id: 'ped-a', numeroVenda: 1, codigoVenda: 'V0001', statusDelivery: 'EM_ROTA' })
    )
    aplicarPedidoDeliveryCriadoNoKanbanCache(
      queryClient,
      summary({
        id: 'ped-b',
        numeroVenda: 2,
        codigoVenda: 'V0002',
        statusDelivery: 'EM_ROTA',
        cliente: { id: 'cli-b', nome: 'Bia' },
      })
    )

    expect(
      aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(queryClient, {
        id: 'ped-a',
        statusDelivery: 'EM_ROTA',
      })
    ).toBe(true)

    const rota = queryClient.getQueryData<InfiniteData<PedidosDeliveryInfinitePage>>([
      'tenant',
      'emp-1',
      'delivery',
      'pedidos',
      'infinite',
      'column',
      'EM_ROTA',
      {},
    ])
    expect(rota?.pages[0].items.map(i => i.id)).toEqual(['ped-b', 'ped-a'])
    expect(rota?.pages[0].items[1]?.cliente?.nome).toBe('Ana')
  })

  it('payload fino sem card no cache pede invalidate', () => {
    const queryClient = new QueryClient()
    seedColuna(queryClient, 'EM_ROTA')
    expect(
      aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(queryClient, {
        id: 'ped-rt-1',
        statusDelivery: 'EM_ROTA',
      })
    ).toBe(false)
  })
})
