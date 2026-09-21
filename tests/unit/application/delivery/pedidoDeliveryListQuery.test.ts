import { describe, expect, it } from 'vitest'
import {
  extrairPedidosDeliveryQueryParamsDeSearchParams,
  mapOrigemApiParaFiltroKanban,
  mapOrigemFiltroKanbanParaApi,
  montarPedidosDeliveryQueryParams,
  serializarPedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListQuery'
import { PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'

describe('pedidoDeliveryListQuery — origem toolbar ↔ API', () => {
  it('mapeia GESTOR e JIFFY_DELIVERY', () => {
    expect(mapOrigemFiltroKanbanParaApi('GESTOR')).toBe('GESTOR')
    expect(mapOrigemFiltroKanbanParaApi('JIFFY_DELIVERY')).toBe('JIFFY_DELIVERY')
  })

  it('todas e PDV não enviam filtro de origem', () => {
    expect(mapOrigemFiltroKanbanParaApi('')).toBeUndefined()
    expect(mapOrigemFiltroKanbanParaApi('PDV')).toBeUndefined()
    expect(mapOrigemFiltroKanbanParaApi(undefined)).toBeUndefined()
  })

  it('inverte origem da API para filtro do Kanban', () => {
    expect(mapOrigemApiParaFiltroKanban('GESTOR')).toBe('GESTOR')
    expect(mapOrigemApiParaFiltroKanban('JIFFY_DELIVERY')).toBe('JIFFY_DELIVERY')
    expect(mapOrigemApiParaFiltroKanban('PDV')).toBe('PDV')
    expect(mapOrigemApiParaFiltroKanban('IFOOD')).toBeUndefined()
  })
})

describe('pedidoDeliveryListQuery — serialização', () => {
  it('omite cancelado quando o filtro manda null', () => {
    const params = montarPedidosDeliveryQueryParams({
      statusDelivery: ['FINALIZADO', 'CANCELADO'],
      cancelado: null,
    })
    expect(params.cancelado).toBeUndefined()
    expect(params.statusDelivery).toEqual(['FINALIZADO', 'CANCELADO'])
  })

  it('monta params do Kanban com cancelado=false e datas de finalização renomeadas', () => {
    const params = montarPedidosDeliveryQueryParams({
      q: '  cliente  ',
      origemFiltroKanban: 'JIFFY_DELIVERY',
      dataCriacaoInicial: '2026-06-01T00:00:00.000Z',
      dataCriacaoFinal: '2026-06-01T23:59:59.999Z',
      dataFinalizacaoInicio: '2026-06-02T00:00:00.000Z',
      dataFinalizacaoFim: '2026-06-02T23:59:59.999Z',
      offset: 50,
    })

    expect(params).toMatchObject({
      q: 'cliente',
      origem: 'JIFFY_DELIVERY',
      dataFinalizacaoInicial: '2026-06-02T00:00:00.000Z',
      dataFinalizacaoFinal: '2026-06-02T23:59:59.999Z',
      cancelado: false,
      offset: 50,
      limit: PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE,
    })
  })

  it('serializa arrays com vírgula', () => {
    const qs = serializarPedidosDeliveryQueryParams({
      statusDelivery: ['PENDENTE', 'EM_PREPARO'],
      origem: ['GESTOR', 'JIFFY_DELIVERY'],
      limit: 25,
    })

    expect(qs.getAll('statusDelivery')).toEqual(['PENDENTE', 'EM_PREPARO'])
    expect(qs.getAll('origem')).toEqual(['GESTOR', 'JIFFY_DELIVERY'])
    expect(qs.get('limit')).toBe('25')
  })
})

describe('pedidoDeliveryListQuery — roteamento BFF', () => {
  it('extrai params da URL do BFF com alias de datas do Kanban', () => {
    const params = extrairPedidosDeliveryQueryParamsDeSearchParams(
      new URLSearchParams(
        'offset=100&limit=25&q=teste&origem=JIFFY_DELIVERY&dataFinalizacaoInicio=2026-06-01T00:00:00.000Z&cancelado=false'
      )
    )

    expect(params).toMatchObject({
      offset: 100,
      limit: 25,
      q: 'teste',
      origem: 'JIFFY_DELIVERY',
      dataFinalizacaoInicial: '2026-06-01T00:00:00.000Z',
      cancelado: false,
    })
  })
})
