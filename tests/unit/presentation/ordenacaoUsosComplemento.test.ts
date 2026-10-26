import { describe, expect, it } from 'vitest'
import type { ComplementoUsoNoMenu } from '@/src/domain/complemento/tipos'
import { ordenarUsosComplemento } from '@/src/presentation/components/features/complementos/ordenacaoUsosComplemento'

function uso(produto: string, menu: string, grupo: string): ComplementoUsoNoMenu {
  return {
    menuProdutoId: `${produto}-${menu}-${grupo}`,
    menu: { id: menu, nome: menu, ativo: true },
    produto: { id: produto, nome: produto, ativo: true },
    grupoProduto: { id: 'grupo-produto', nome: 'Lanches' },
    grupoComplementos: { id: grupo, nome: grupo },
    complementoConfig: { ordem: 1, valor: 2, ativo: true },
  }
}

describe('ordenarUsosComplemento', () => {
  const usos = [
    uso('Produto B', 'Menu A', 'Grupo B'),
    uso('Produto A', 'Menu B', 'Grupo A'),
    uso('Produto A', 'Menu A', 'Grupo B'),
  ]

  it('ordena crescentemente pela coluna e usa as demais como desempate', () => {
    expect(ordenarUsosComplemento(usos, 'produto', 'asc').map(item => item.menu.nome)).toEqual([
      'Menu A',
      'Menu B',
      'Menu A',
    ])
    expect(ordenarUsosComplemento(usos, 'menu', 'asc').map(item => item.produto.nome)).toEqual([
      'Produto A',
      'Produto B',
      'Produto A',
    ])
    expect(ordenarUsosComplemento(usos, 'grupo', 'asc').map(item => item.grupoComplementos.nome)).toEqual([
      'Grupo A',
      'Grupo B',
      'Grupo B',
    ])
  })

  it('ordena decrescentemente pela coluna selecionada sem mutar a lista original', () => {
    const resultado = ordenarUsosComplemento(usos, 'produto', 'desc')

    expect(resultado.map(item => item.produto.nome)).toEqual(['Produto B', 'Produto A', 'Produto A'])
    expect(usos[0]?.produto.nome).toBe('Produto B')
  })
})
