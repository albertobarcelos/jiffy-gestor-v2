import { describe, expect, it } from 'vitest'
import {
  deveLimparPagamentosAoTrocarTipo,
  resolverFiltroMeiosPagamentoNovoPedido,
} from '@/src/domain/policies/pedido/MeiosPagamentoNovoPedidoPolicy'

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
    ).toEqual({ ativoEntregaDelivery: true })

    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: true,
        pedidoExistente: false,
      })
    ).toEqual({ ativoRetiradaDelivery: true })
  })

  it('usa a flag específica do tipo ao carregar pedido existente', () => {
    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: false,
        pedidoExistente: true,
        tipoEntregaPedidoExistente: 'entrega',
      })
    ).toEqual({ ativoEntregaDelivery: true })

    expect(
      resolverFiltroMeiosPagamentoNovoPedido({
        pedidoDeliveryGestor: true,
        pedidoComRetirada: false,
        pedidoExistente: true,
        tipoEntregaPedidoExistente: 'retirada',
      })
    ).toEqual({ ativoRetiradaDelivery: true })
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

describe('deveLimparPagamentosAoTrocarTipo', () => {
  it('limpa pagamentos ao alternar modalidade em pedido novo', () => {
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'entrega',
        tipoNovo: 'retirada',
        pedidoExistente: false,
      })
    ).toBe(true)
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'retirada',
        tipoNovo: 'entrega',
        pedidoExistente: false,
      })
    ).toBe(true)
  })

  it('não limpa pagamentos quando a modalidade não mudou ou o pedido já existe', () => {
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'entrega',
        tipoNovo: 'entrega',
        pedidoExistente: false,
      })
    ).toBe(false)
    expect(
      deveLimparPagamentosAoTrocarTipo({
        tipoAtual: 'entrega',
        tipoNovo: 'retirada',
        pedidoExistente: true,
      })
    ).toBe(false)
  })
})
