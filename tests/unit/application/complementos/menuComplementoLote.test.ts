import { describe, expect, it } from 'vitest'
import {
  coletarGruposDosProdutosDoMenu,
  lerComplementosResumoLote,
  listarComplementosDoCardapioLote,
} from '@/src/application/complementos/menuComplementoLote'

describe('coletarGruposDosProdutosDoMenu', () => {
  it('une grupos e conta produtos distintos', () => {
    const porId = coletarGruposDosProdutosDoMenu([
      {
        produtoId: 'p1',
        gruposComplementos: [
          { id: 'g1', nome: 'Acrescentar' },
          { id: 'g2', nome: 'Remover' },
        ],
      },
      {
        produtoId: 'p2',
        gruposComplementos: [{ id: 'g1', nome: 'Acrescentar' }],
      },
    ])

    expect(porId.get('g1')?.produtos.size).toBe(2)
    expect(porId.get('g2')?.produtos.size).toBe(1)
    expect(porId.get('g1')?.nome).toBe('Acrescentar')
  })
})

describe('lerComplementosResumoLote', () => {
  it('ignora itens sem id ou nome', () => {
    expect(
      lerComplementosResumoLote([
        { id: 'c1', nome: 'Bacon' },
        { id: 'c2' },
        { nome: 'Sem id' },
        null,
      ])
    ).toEqual([{ id: 'c1', nome: 'Bacon' }])
  })
})

describe('listarComplementosDoCardapioLote', () => {
  it('conta em quantos grupos cada complemento aparece', () => {
    const complementos = listarComplementosDoCardapioLote([
      {
        id: 'g1',
        nome: 'Acrescentar',
        produtos: 2,
        complementos: [
          { id: 'c1', nome: 'Bacon' },
          { id: 'c2', nome: 'Ovo' },
        ],
      },
      {
        id: 'g2',
        nome: 'Remover',
        produtos: 1,
        complementos: [{ id: 'c1', nome: 'Bacon' }],
      },
    ])

    expect(complementos.find(item => item.id === 'c1')?.grupos).toBe(2)
    expect(complementos.find(item => item.id === 'c2')?.grupos).toBe(1)
  })
})
