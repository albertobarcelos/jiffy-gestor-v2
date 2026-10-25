import { describe, expect, it } from 'vitest'
import {
  resolverCobrancaNaEntregaPedido,
  resolverTrocoLevarPedidoEntrega,
} from '@/src/application/mappers/resolverTrocoLevarPedidoEntrega'

describe('resolverTrocoLevarPedidoEntrega', () => {
  it('usa o troco da raiz quando o backend ja calculou', () => {
    expect(
      resolverTrocoLevarPedidoEntrega({
        valorFinal: 39.9,
        troco: 10.1,
      })
    ).toBe(10.1)
  })

  it('deriva troco da cédula na cobrança na_entrega quando a raiz vem 0 (cardapio)', () => {
    expect(
      resolverTrocoLevarPedidoEntrega({
        valorFinal: 39.9,
        totalPago: 0,
        troco: 0,
        cobrancas: [
          {
            id: 'cob-1',
            meioPagamentoId: 'mp-dinheiro',
            valor: 50,
            momentoCobranca: 'na_entrega',
            status: 'pendente',
          },
        ],
      })
    ).toBe(10.1)
  })

  it('nao inventa troco quando a cobrança na entrega cobre o total sem cédula extra', () => {
    expect(
      resolverTrocoLevarPedidoEntrega({
        valorFinal: 39.9,
        troco: 0,
        cobrancas: [
          {
            id: 'cob-1',
            meioPagamentoId: 'mp-dinheiro',
            valor: 39.9,
            momentoCobranca: 'na_entrega',
            status: 'pendente',
          },
        ],
      })
    ).toBe(0)
  })

  it('nao gera troco em PIX na entrega mesmo com valor acima do total', () => {
    expect(
      resolverTrocoLevarPedidoEntrega(
        {
          valorFinal: 39.9,
          troco: 0,
          cobrancas: [
            {
              id: 'cob-1',
              meioPagamentoId: 'mp-pix',
              valor: 50,
              momentoCobranca: 'na_entrega',
              status: 'pendente',
            },
          ],
        },
        [],
        { 'mp-pix': 'PIX' }
      )
    ).toBe(0)
  })
})

describe('resolverCobrancaNaEntregaPedido', () => {
  it('cobra o pedido e leva o troco da cédula', () => {
    expect(
      resolverCobrancaNaEntregaPedido(
        {
          valorFinal: 63,
          totalFaltaPagar: 100,
          troco: 0,
          cobrancas: [
            {
              id: 'cob-1',
              meioPagamentoId: 'mp-dinheiro',
              valor: 100,
              momentoCobranca: 'na_entrega',
              status: 'pendente',
            },
          ],
        },
        { 'mp-dinheiro': 'Dinheiro' }
      )
    ).toEqual({ valorCobrarNaEntrega: 63, trocoParaLevar: 37 })
  })

  it('nao cobra a cédula quando a cobrança ja foi paga, mesmo com totalFaltaPagar velho', () => {
    expect(
      resolverCobrancaNaEntregaPedido({
        valorFinal: 39.9,
        totalFaltaPagar: 50,
        troco: 10.1,
        cobrancas: [
          {
            id: 'cob-1',
            meioPagamentoId: 'mp-dinheiro',
            valor: 50,
            momentoCobranca: 'na_entrega',
            status: 'paga',
          },
        ],
      })
    ).toEqual({ valorCobrarNaEntrega: 0, trocoParaLevar: 10.1 })
  })
})
