import { describe, expect, it } from 'vitest'
import {
  detalhePedidoDeliveryParaProdutosDashboard,
  idsPedidosDeliveryFinalizados,
  mesclarAgregacaoPorProdutoId,
} from '@/src/infrastructure/dashboard/buscarDetalhesPedidosDeliveryDashboard'
import { agregarProdutosLancadosPorProdutoId } from '@/src/infrastructure/dashboard/agregarVendasPorProdutoPdv'

describe('detalhePedidoDeliveryParaProdutosDashboard', () => {
  it('lê produtosLancados e ignora removido', () => {
    const detalhe = detalhePedidoDeliveryParaProdutosDashboard({
      valorFinal: 42,
      produtosLancados: [
        { produtoId: 'a', quantidade: 2, valorFinal: 20 },
        { produtoId: 'b', quantidade: 1, valorFinal: 10, removido: true },
        { produtoId: '', quantidade: 3, valorFinal: 9 },
      ],
    })

    expect(detalhe?.valorFinal).toBe(42)
    expect(detalhe?.produtosLancados).toEqual([
      { produtoId: 'a', quantidade: 2, valorFinal: 20, removido: false },
      { produtoId: 'b', quantidade: 1, valorFinal: 10, removido: true },
    ])
  })

  it('cai em produtos e estima valorFinal pela unitária', () => {
    const detalhe = detalhePedidoDeliveryParaProdutosDashboard({
      data: {
        valorFinal: '15',
        produtos: [{ produtoId: 'x', quantidade: 3, valorUnitario: 5 }],
      },
    })

    expect(detalhe?.produtosLancados).toEqual([
      { produtoId: 'x', quantidade: 3, valorFinal: 15, removido: false },
    ])
  })
})

describe('mesclarAgregacaoPorProdutoId', () => {
  it('soma delivery no agregado PDV sem apagar o que já existia', () => {
    const pdv = agregarProdutosLancadosPorProdutoId([
      { produtosLancados: [{ produtoId: 'burger', quantidade: 1, valorFinal: 30 }] },
    ])
    const delivery = agregarProdutosLancadosPorProdutoId([
      { produtosLancados: [{ produtoId: 'burger', quantidade: 2, valorFinal: 60 }] },
      { produtosLancados: [{ produtoId: 'refri', quantidade: 1, valorFinal: 8 }] },
    ])

    const mesclado = mesclarAgregacaoPorProdutoId(pdv, delivery)
    expect(mesclado.get('burger')).toEqual({ quantidade: 3, valorTotal: 90 })
    expect(mesclado.get('refri')).toEqual({ quantidade: 1, valorTotal: 8 })
  })
})

describe('idsPedidosDeliveryFinalizados', () => {
  it('fica só com FINALIZADO', () => {
    expect(
      idsPedidosDeliveryFinalizados([
        { id: '1', statusDelivery: 'FINALIZADO', dataFinalizacao: '2026-09-25T12:00:00.000Z' },
        { id: '2', statusDelivery: 'CANCELADO', dataCancelamento: '2026-09-25T13:00:00.000Z' },
      ] as never)
    ).toEqual(['1'])
  })
})
