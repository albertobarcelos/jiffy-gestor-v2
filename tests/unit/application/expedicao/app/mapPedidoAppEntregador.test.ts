import { describe, expect, it } from 'vitest'
import {
  aplicarNomesMeiosNoPedido,
  cobrancaPedidoAppEstaPaga,
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

  it('não mostra UUID no lugar do nome', () => {
    expect(
      rotuloPagamentoPedidoApp({
        formaPagamento: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      })
    ).toBeNull()
  })
})

describe('cobrancaPedidoAppEstaPaga', () => {
  it('não trata lançamento na entrega como pago', () => {
    expect(
      cobrancaPedidoAppEstaPaga({
        status: 'pendente',
        momentoCobranca: 'na_entrega',
        pagamentoEfetivado: {},
      })
    ).toBe(false)
    expect(
      cobrancaPedidoAppEstaPaga({
        momentoCobranca: 'na_entrega',
        pagamentoEfetivado: { confirmar: true },
      })
    ).toBe(false)
  })

  it('só marca pago quando a cobrança foi efetivada', () => {
    expect(cobrancaPedidoAppEstaPaga({ status: 'paga', momentoCobranca: 'na_entrega' })).toBe(true)
    expect(cobrancaPedidoAppEstaPaga({ status: 'paga', momentoCobranca: 'antecipado' })).toBe(true)
    expect(cobrancaPedidoAppEstaPaga({ pagamentoEfetivado: { id: 'pe-1' } })).toBe(true)
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
      cobrancas: [
        {
          id: 'cob-1',
          meioPagamentoId: 'mp-din',
          valor: 49.4,
          status: 'pendente',
          meioPagamento: { nome: 'Dinheiro' },
        },
      ],
    })
    expect(pedido?.formaPagamento).toBe('Dinheiro')
    expect(pedido?.numeroVenda).toBe(69)
    expect(pedido?.faltaPagar).toBe(49.4)
    expect(pedido?.cobrancas).toEqual([
      { id: 'cob-1', meioPagamentoId: 'mp-din', valor: 49.4, pendente: true, nome: 'Dinheiro' },
    ])
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
    expect(pedido?.cobrancas).toEqual([
      { id: '', meioPagamentoId: 'meio-dinheiro', valor: 0, pendente: true, nome: null },
    ])
    expect(
      aplicarNomesMeiosNoPedido(pedido!, { 'meio-dinheiro': 'Dinheiro' }).formaPagamento
    ).toBe('Dinheiro')
  })

  it('troca UUID já gravado no resumo pelo nome do catálogo', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p1',
      formaPagamento: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      cobrancas: [
        {
          meioPagamentoId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          nome: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          status: 'pendente',
        },
      ],
    })
    expect(pedido?.formaPagamento).toBeNull()
    expect(
      aplicarNomesMeiosNoPedido(pedido!, {
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890': 'Pix',
      }).formaPagamento
    ).toBe('Pix')
  })
})
