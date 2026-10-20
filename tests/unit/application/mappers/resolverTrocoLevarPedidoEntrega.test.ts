import { describe, expect, it } from 'vitest'
import { resolverTrocoLevarPedidoEntrega } from '@/src/application/mappers/resolverTrocoLevarPedidoEntrega'

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
