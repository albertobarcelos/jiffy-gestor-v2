import { describe, expect, it } from 'vitest'
import { Produto } from '@/src/domain/entities/Produto'
import { sortProdutosPorOrdemMenu } from '@/src/presentation/components/features/produtos/ProdutosList/utils'

function produto(partial: { id: string; nome: string; grupoId?: string; ordem?: number }) {
  return Produto.fromJSON({
    id: partial.id,
    nome: partial.nome,
    grupoId: partial.grupoId,
    ordem: partial.ordem,
    valor: 1,
    ativo: true,
  })
}

describe('sortProdutosPorOrdemMenu', () => {
  it('ordena pela categoria do cardápio e depois pela ordem do produto', () => {
    const ordemGrupo = new Map([
      ['pizzas', 2],
      ['lanches', 1],
    ])
    const ordered = sortProdutosPorOrdemMenu(
      [
        produto({ id: '3', nome: 'Pizza', grupoId: 'pizzas', ordem: 1 }),
        produto({ id: '2', nome: 'X-Bacon', grupoId: 'lanches', ordem: 2 }),
        produto({ id: '1', nome: 'X-Salada', grupoId: 'lanches', ordem: 1 }),
      ],
      ordemGrupo
    )

    expect(ordered.map(p => p.getId())).toEqual(['1', '2', '3'])
  })

  it('não usa o nome quando a ordem do menu já define a posição', () => {
    const ordemGrupo = new Map([['bebidas', 1]])
    const ordered = sortProdutosPorOrdemMenu(
      [
        produto({ id: 'a', nome: 'Água', grupoId: 'bebidas', ordem: 2 }),
        produto({ id: 'c', nome: 'Coca', grupoId: 'bebidas', ordem: 1 }),
      ],
      ordemGrupo
    )

    expect(ordered.map(p => p.getNome())).toEqual(['Coca', 'Água'])
  })
})
