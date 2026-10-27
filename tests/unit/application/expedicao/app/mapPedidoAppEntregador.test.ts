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
    expect(cobrancaPedidoAppEstaPaga({ status: 'pendente', momentoCobranca: 'antecipado' })).toBe(
      true
    )
    expect(cobrancaPedidoAppEstaPaga({ pagamentoEfetivado: { id: 'pe-1' } })).toBe(true)
  })
})

describe('mapPedidoAppEntregador', () => {
  it('cobra na porta só o PIX quando o dinheiro já foi antecipado', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p1',
      valorFinal: 300,
      totalFaltaPagar: 300,
      cobrancas: [
        {
          id: 'cob-din',
          meioPagamentoId: 'mp-din',
          valor: 15,
          status: 'pendente',
          momentoCobranca: 'antecipado',
          meioPagamento: { nome: 'Dinheiro' },
        },
        {
          id: 'cob-pix',
          meioPagamentoId: 'mp-pix',
          valor: 285,
          status: 'pendente',
          momentoCobranca: 'na_entrega',
          meioPagamento: { nome: 'Pix' },
        },
      ],
    })
    expect(pedido?.faltaPagar).toBe(285)
    expect(pedido?.cobrancas).toEqual([
      { id: 'cob-din', meioPagamentoId: 'mp-din', valor: 15, pendente: false, nome: 'Dinheiro' },
      { id: 'cob-pix', meioPagamentoId: 'mp-pix', valor: 285, pendente: true, nome: 'Pix' },
    ])
  })

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

  it('leva o troco da mesma regra do cupom', () => {
    const peloCampo = mapPedidoAppEntregador({
      id: 'p1',
      valorFinal: 39.9,
      troco: 10.1,
    })
    expect(peloCampo?.trocoLevar).toBe(10.1)

    const pelaCedula = mapPedidoAppEntregador({
      id: 'p2',
      valorFinal: 39.9,
      troco: 0,
      cobrancas: [
        {
          id: 'cob-1',
          meioPagamentoId: 'mp-dinheiro',
          valor: 50,
          momentoCobranca: 'na_entrega',
          status: 'pendente',
          meioPagamento: { nome: 'Dinheiro' },
        },
      ],
    })
    expect(pelaCedula?.trocoLevar).toBe(10.1)
    expect(pelaCedula?.faltaPagar).toBe(39.9)
  })

  it('na rodada cobra o pedido e mostra o troco da cédula, não os 500 lançados', () => {
    const pedido = mapPedidoAppEntregador({
      id: 'p466',
      numeroVenda: 466,
      valorFinal: 300,
      totalFaltaPagar: 500,
      cobrancas: [
        {
          id: 'cob-din',
          meioPagamentoId: 'mp-din',
          valor: 500,
          momentoCobranca: 'na_entrega',
          status: 'pendente',
        },
      ],
    })
    expect(pedido?.trocoLevar).toBe(200)
    expect(pedido?.faltaPagar).toBe(300)
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
