import { describe, expect, it } from 'vitest'
import {
  extrairPedidosDeliveryQueryParamsDeSearchParams,
  isRequisicaoListagemPedidosIntegradorLegada,
  isRequisicaoListagemPedidosJiffy,
  mapOrigemApiParaFiltroKanban,
  mapOrigemFiltroKanbanParaApi,
  montarPedidosDeliveryQueryParams,
  serializarPedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListQuery'
import { PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'

describe('pedidoDeliveryListQuery — origem toolbar ↔ API', () => {
  it('mapeia GESTOR e DELIVERY para valores da API', () => {
    expect(mapOrigemFiltroKanbanParaApi('GESTOR')).toBe('GESTOR')
    expect(mapOrigemFiltroKanbanParaApi('DELIVERY')).toBe('JIFFY_DELIVERY')
  })

  it('todas e PDV não enviam filtro de origem', () => {
    expect(mapOrigemFiltroKanbanParaApi('')).toBeUndefined()
    expect(mapOrigemFiltroKanbanParaApi('PDV')).toBeUndefined()
    expect(mapOrigemFiltroKanbanParaApi(undefined)).toBeUndefined()
  })

  it('inverte origem da API para filtro do Kanban', () => {
    expect(mapOrigemApiParaFiltroKanban('GESTOR')).toBe('GESTOR')
    expect(mapOrigemApiParaFiltroKanban('JIFFY_DELIVERY')).toBe('DELIVERY')
    expect(mapOrigemApiParaFiltroKanban('PDV')).toBeUndefined()
  })
})

describe('pedidoDeliveryListQuery — serialização', () => {
  it('monta params do Kanban com cancelado=false e datas de finalização renomeadas', () => {
    const params = montarPedidosDeliveryQueryParams({
      q: '  cliente  ',
      origemFiltroKanban: 'DELIVERY',
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

    expect(qs.get('statusDelivery')).toBe('PENDENTE,EM_PREPARO')
    expect(qs.get('origem')).toBe('GESTOR,JIFFY_DELIVERY')
    expect(qs.get('limit')).toBe('25')
  })
})

describe('pedidoDeliveryListQuery — roteamento BFF', () => {
  it('detecta query Jiffy vs integrador legado', () => {
    const jiffy = new URLSearchParams('offset=0&limit=50&cancelado=false')
    expect(isRequisicaoListagemPedidosJiffy(jiffy)).toBe(true)
    expect(
      isRequisicaoListagemPedidosIntegradorLegada(jiffy, { bearerHeaderCustom: 'token' })
    ).toBe(false)

    const legado = new URLSearchParams('status=1')
    expect(isRequisicaoListagemPedidosIntegradorLegada(legado, {})).toBe(true)

    const bearerOnly = new URLSearchParams('')
    expect(
      isRequisicaoListagemPedidosIntegradorLegada(bearerOnly, {
        bearerHeaderCustom: 'integrador-token',
      })
    ).toBe(true)
  })

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
