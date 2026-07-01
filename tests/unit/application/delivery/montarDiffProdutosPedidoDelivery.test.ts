import { describe, expect, it } from 'vitest'
import { montarDiffProdutosPedidoDelivery } from '@/src/application/delivery/montarDiffProdutosPedidoDelivery'
import type { ProdutoSelecionado } from '@/src/domain/types/pedido'

function item(over: Partial<ProdutoSelecionado>): ProdutoSelecionado {
  return {
    produtoId: 'cat-1',
    nome: 'Produto',
    quantidade: 1,
    valorUnitario: 10,
    complementos: [],
    ...over,
  }
}

describe('montarDiffProdutosPedidoDelivery', () => {
  it('item inalterado não gera operação', () => {
    const original = item({ produtoId: 'cat-1', produtoLancadoId: 'lan-1', quantidade: 2 })
    const diff = montarDiffProdutosPedidoDelivery([original], [{ ...original }])

    expect(diff.alterou).toBe(false)
    expect(diff.add).toHaveLength(0)
    expect(diff.remove).toHaveLength(0)
  })

  it('novo item (sem produtoLancadoId) vai para add', () => {
    const original = item({ produtoId: 'cat-1', produtoLancadoId: 'lan-1' })
    const novo = item({ produtoId: 'cat-2', nome: 'Novo' })
    const diff = montarDiffProdutosPedidoDelivery([original], [original, novo])

    expect(diff.remove).toHaveLength(0)
    expect(diff.add).toHaveLength(1)
    expect(diff.add[0]).toMatchObject({ produtoId: 'cat-2', quantidade: 1 })
  })

  it('item removido na UI vai para remove', () => {
    const a = item({ produtoId: 'cat-1', produtoLancadoId: 'lan-1' })
    const b = item({ produtoId: 'cat-2', produtoLancadoId: 'lan-2' })
    const diff = montarDiffProdutosPedidoDelivery([a, b], [a])

    expect(diff.remove).toEqual(['lan-2'])
    expect(diff.add).toHaveLength(0)
    expect(diff.alterou).toBe(true)
  })

  it('alterar quantidade vira remove + add do mesmo item', () => {
    const original = item({ produtoId: 'cat-1', produtoLancadoId: 'lan-1', quantidade: 1 })
    const editado = item({ produtoId: 'cat-1', produtoLancadoId: 'lan-1', quantidade: 3 })
    const diff = montarDiffProdutosPedidoDelivery([original], [editado])

    expect(diff.remove).toEqual(['lan-1'])
    expect(diff.add).toHaveLength(1)
    expect(diff.add[0]).toMatchObject({ produtoId: 'cat-1', quantidade: 3 })
  })

  it('lista final vazia sinaliza resultariaSemProdutos', () => {
    const original = item({ produtoId: 'cat-1', produtoLancadoId: 'lan-1' })
    const diff = montarDiffProdutosPedidoDelivery([original], [])

    expect(diff.resultariaSemProdutos).toBe(true)
    expect(diff.remove).toEqual(['lan-1'])
  })

  it('original sem produtoLancadoId sinaliza algumOriginalSemId', () => {
    const original = item({ produtoId: 'cat-1' })
    const diff = montarDiffProdutosPedidoDelivery([original], [original])

    expect(diff.algumOriginalSemId).toBe(true)
  })
})
