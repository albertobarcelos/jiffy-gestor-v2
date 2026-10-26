import { describe, expect, it } from 'vitest'
import {
  escolherPedidoPeloCodigo,
  mapPedidoLeituraExpedicao,
} from '@/src/application/expedicao/mapPedidoLeituraExpedicao'

describe('escolherPedidoPeloCodigo', () => {
  const items = [
    { id: 'a', codigoVenda: 'JTTHYODA', numeroVenda: 12 },
    { id: 'b', codigoVenda: 'POCYXUVK', numeroVenda: 69 },
  ]

  it('acha pelo código da comanda', () => {
    expect(escolherPedidoPeloCodigo(items, 'jtthyoda')).toMatchObject({ id: 'a' })
  })

  it('acha pelo número do pedido', () => {
    expect(escolherPedidoPeloCodigo(items, '69')).toMatchObject({ id: 'b' })
    expect(escolherPedidoPeloCodigo(items, ' 12 ')).toMatchObject({ id: 'a' })
  })

  it('não acha lixo', () => {
    expect(escolherPedidoPeloCodigo(items, '')).toBeNull()
    expect(escolherPedidoPeloCodigo(items, '999')).toBeNull()
  })
})

describe('mapPedidoLeituraExpedicao', () => {
  it('traz endereço, pagamento e total para o card da rodada', () => {
    const pedido = mapPedidoLeituraExpedicao({
      id: 'p1',
      codigoVenda: 'abc',
      numeroVenda: 23,
      valorFinal: 284.79,
      totalFaltaPagar: 284.79,
      statusDelivery: 'PRONTO',
      cliente: { nome: 'KLEVERSON' },
      contextoEntrega: {
        enderecoEntrega: { rua: 'Avenida Central', numero: '748', bairro: 'CENTRO' },
      },
      cobrancas: [
        {
          id: 'c1',
          meioPagamentoId: 'mp-pix',
          valor: 284.79,
          status: 'pendente',
          meioPagamento: { nome: 'PIX' },
        },
      ],
      produtosLancados: [{ id: 'i1', nomeProduto: 'Pastel', quantidade: 2 }],
    })
    expect(pedido).toMatchObject({
      numeroVenda: 23,
      clienteNome: 'KLEVERSON',
      bairro: 'CENTRO',
      endereco: 'Avenida Central, 748 — CENTRO',
      formaPagamento: 'PIX',
      valorFinal: 284.79,
      faltaPagar: 284.79,
    })
    expect(pedido?.itens).toHaveLength(1)
  })
})
