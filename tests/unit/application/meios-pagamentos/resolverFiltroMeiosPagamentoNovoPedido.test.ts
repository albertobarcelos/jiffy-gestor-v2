import { describe, expect, it } from 'vitest'
import { resolverFiltroMeiosPagamentoNovoPedido } from '@/src/application/meios-pagamentos/resolverFiltroMeiosPagamentoNovoPedido'

describe('resolverFiltroMeiosPagamentoNovoPedido', () => {
  it('mantém o filtro de meios ativos do balcão', () => {
    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: false,
        pedidoComRetirada: false,
        pedidoExistente: false,
      })
    ).toEqual({ ativo: true })
  })

  it('filtra novos pedidos Delivery pela flag da modalidade escolhida', () => {
    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: false,
        pedidoExistente: false,
      })
    ).toEqual({ ativoEntregaDelivery: true, ativoDelivery: true })

    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: true,
        pedidoExistente: false,
      })
    ).toEqual({ ativoRetiradaDelivery: true, ativoDelivery: true })
  })

  it('usa a flag específica do tipo ao carregar pedido existente', () => {
    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: false,
        pedidoExistente: true,
        tipoEntregaPedidoExistente: 'entrega',
      })
    ).toEqual({ ativoEntregaDelivery: true, ativoDelivery: true })

    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: false,
        pedidoExistente: true,
        tipoEntregaPedidoExistente: 'retirada',
      })
    ).toEqual({ ativoRetiradaDelivery: true, ativoDelivery: true })
  })

  it('não restringe meios até carregar o tipo do pedido existente', () => {
    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: false,
        pedidoExistente: true,
      })
    ).toEqual({})
  })
})
