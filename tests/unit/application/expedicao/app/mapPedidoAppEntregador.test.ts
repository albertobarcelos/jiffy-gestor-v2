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
})
