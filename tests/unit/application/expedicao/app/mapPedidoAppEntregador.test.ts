import { describe, expect, it } from 'vitest'
import {
  aplicarNomesMeiosNoPedido,
  mapPedidoAppEntregador,
  rotuloPagamentoPedidoApp,
} from '@/src/application/expedicao/app/mapPedidoAppEntregador'

describe('rotuloPagamentoPedidoApp', () => {
  it('junta os nomes das cobranças ativas', () => {
    expect(
      rotuloPagamentoPedidoApp({
        cobrancas: [
          { meioPagamento: { nome: 'Dinheiro' }, status: 'pendente' },
          { nomeMeioPagamento: 'Pix', status: 'paga' },
          { meioPagamento: { nome: 'Cartão' }, status: 'cancelada' },
        ],
      })
    ).toBe('Dinheiro + Pix')
  })

  it('cai no fallback do pedido', () => {
    expect(rotuloPagamentoPedidoApp({ formaPagamento: 'Crédito' })).toBe('Crédito')
  })
})

describe('mapPedidoAppEntregador', () => {
  it('leva forma de pagamento no resumo', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p1',
      numeroVenda: 69,
      codigoVenda: 'ABC',
      valorFinal: 49.4,
      totalFaltaPagar: 49.4,
      cobrancas: [{ meioPagamento: { nome: 'Dinheiro' } }],
    })
    expect(pedido?.formaPagamento).toBe('Dinheiro')
    expect(pedido?.numeroVenda).toBe(69)
    expect(pedido?.faltaPagar).toBe(49.4)
    expect(pedido?.trocoParaLevar).toBe(0)
  })

  it('cobra o pedido e leva o troco da cédula na entrega', () => {
    const pedido = mapPedidoAppEntregador(
      {
        id: 'p1',
        valorFinal: 39.9,
        totalFaltaPagar: 50,
        troco: 0,
        cobrancas: [
          {
            meioPagamentoId: 'mp-dinheiro',
            valor: 50,
            momentoCobranca: 'na_entrega',
            status: 'pendente',
          },
        ],
      },
      { 'mp-dinheiro': 'Dinheiro' }
    )
    expect(pedido?.faltaPagar).toBe(39.9)
    expect(pedido?.trocoParaLevar).toBe(10.1)
  })

  it('nao inventa troco em PIX na entrega mesmo com valor acima do total', () => {
    const pedido = mapPedidoAppEntregador(
      {
        id: 'p1',
        valorFinal: 39.9,
        totalFaltaPagar: 50,
        troco: 0,
        cobrancas: [
          {
            meioPagamentoId: 'mp-pix',
            valor: 50,
            momentoCobranca: 'na_entrega',
            status: 'pendente',
          },
        ],
      },
      { 'mp-pix': 'PIX' }
    )
    expect(pedido?.faltaPagar).toBe(50)
    expect(pedido?.trocoParaLevar).toBe(0)
  })

  it('pedido de 63 com nota de 100 cobra 63 e leva 37', () => {
    const pedido = mapPedidoAppEntregador(
      {
        id: 'p1',
        valorFinal: 63,
        totalFaltaPagar: 100,
        troco: 0,
        cobrancas: [
          {
            meioPagamentoId: 'mp-dinheiro',
            valor: 100,
            momentoCobranca: 'na_entrega',
            status: 'pendente',
          },
        ],
      },
      { 'mp-dinheiro': 'Dinheiro' }
    )
    expect(pedido?.faltaPagar).toBe(63)
    expect(pedido?.trocoParaLevar).toBe(37)
  })

  it('nao cobra quando a cobranca ja foi paga mesmo com totalFaltaPagar velho', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p1',
      valorFinal: 39.9,
      totalFaltaPagar: 50,
      troco: 10.1,
      cobrancas: [
        {
          meioPagamentoId: 'mp-dinheiro',
          valor: 50,
          momentoCobranca: 'na_entrega',
          status: 'paga',
        },
      ],
    })
    expect(pedido?.faltaPagar).toBe(0)
    expect(pedido?.trocoParaLevar).toBe(0)
  })

  it('nao pede para levar troco quando o pedido ja foi pago', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p1',
      valorFinal: 39.9,
      totalFaltaPagar: 0,
      troco: 10.1,
      cobrancas: [
        {
          meioPagamentoId: 'mp-dinheiro',
          valor: 50,
          momentoCobranca: 'na_entrega',
          status: 'paga',
        },
      ],
    })
    expect(pedido?.faltaPagar).toBe(0)
    expect(pedido?.trocoParaLevar).toBe(0)
  })

  it('monta o endereço completo para o Waze', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p1',
      contextoEntrega: {
        enderecoEntrega: {
          rua: 'RUA SETE',
          numero: '40',
          bairro: 'COHAB JOÃO CRISTINI',
          cidade: 'BARRA DO BUGRES',
          estado: 'MT',
          cep: '78390000',
        },
      },
    })
    expect(pedido?.endereco).toBe('RUA SETE, 40 — COHAB JOÃO CRISTINI')
    expect(pedido?.enderecoNavegacao).toBe(
      'RUA SETE, 40 — COHAB JOÃO CRISTINI — BARRA DO BUGRES — MT — 78390-000'
    )
  })

  it('guarda o id quando a lista só manda meioPagamentoId', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p1',
      cobrancas: [{ meioPagamentoId: 'meio-dinheiro', status: 'pendente' }],
    })
    expect(pedido?.formaPagamento).toBeNull()
    expect(pedido?.meioPagamentoIds).toEqual(['meio-dinheiro'])
    expect(
      aplicarNomesMeiosNoPedido(pedido!, { 'meio-dinheiro': 'Dinheiro' }).formaPagamento
    ).toBe('Dinheiro')
  })
})
