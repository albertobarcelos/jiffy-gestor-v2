import { describe, expect, it } from 'vitest'
import {
  listarLinhasImpactoLote,
  montarGrupoImpactoLoteDeJson,
  montarParesImpactoLote,
  partirParesImpactoEmLotes,
  lerComplementosImpactoDoGrupo,
  type GrupoImpactoLote,
} from '@/src/application/complementos/impactoComplementoLote'

const grupoAdd: GrupoImpactoLote = {
  id: 'g-add',
  nome: 'ADD',
  ativo: true,
  complementos: [
    { id: 'c-sal', nome: 'SAL', tipoImpactoPreco: 'aumenta' },
    { id: 'c-bacon', nome: 'Bacon', tipoImpactoPreco: 'aumenta' },
  ],
}

const grupoRemover: GrupoImpactoLote = {
  id: 'g-rem',
  nome: 'REMOVER',
  ativo: true,
  complementos: [
    { id: 'c-bacon', nome: 'Bacon', tipoImpactoPreco: 'diminui' },
    { id: 'c-cal', nome: 'Calabresa', tipoImpactoPreco: 'diminui' },
  ],
}

describe('lerComplementosImpactoDoGrupo', () => {
  it('normaliza impacto e ignora itens sem id/nome', () => {
    expect(
      lerComplementosImpactoDoGrupo([
        { id: '1', nome: 'A', tipoImpactoPreco: 'AUMENTA' },
        { id: '2', nome: 'B' },
        { id: '', nome: 'X' },
        { nome: 'sem-id' },
      ])
    ).toEqual([
      { id: '1', nome: 'A', tipoImpactoPreco: 'aumenta' },
      { id: '2', nome: 'B', tipoImpactoPreco: 'nenhum' },
    ])
  })
})

describe('montarGrupoImpactoLoteDeJson', () => {
  it('monta grupo a partir do JSON da API', () => {
    expect(
      montarGrupoImpactoLoteDeJson({
        id: 'g1',
        nome: 'ADD',
        ativo: true,
        complementos: [{ id: 'c1', nome: 'SAL', tipoImpactoPreco: 'nenhum' }],
      })
    ).toEqual({
      id: 'g1',
      nome: 'ADD',
      ativo: true,
      complementos: [{ id: 'c1', nome: 'SAL', tipoImpactoPreco: 'nenhum' }],
    })
  })

  it('retorna null sem id ou nome', () => {
    expect(montarGrupoImpactoLoteDeJson({ id: 'g1' })).toBeNull()
    expect(montarGrupoImpactoLoteDeJson(null)).toBeNull()
  })
})

describe('listarLinhasImpactoLote', () => {
  it('emite uma linha por par grupo×complemento, mesmo com nome repetido', () => {
    const linhas = listarLinhasImpactoLote([grupoAdd, grupoRemover])
    expect(linhas.map(item => item.chave)).toEqual([
      'g-add:c-bacon',
      'g-rem:c-bacon',
      'g-rem:c-cal',
      'g-add:c-sal',
    ])

    const bacons = linhas.filter(item => item.complementoId === 'c-bacon')
    expect(bacons).toHaveLength(2)
    expect(bacons.map(item => item.grupoNome)).toEqual(['ADD', 'REMOVER'])
    expect(bacons.map(item => item.tipoImpactoPreco)).toEqual(['aumenta', 'diminui'])
  })
})

describe('montarParesImpactoLote', () => {
  it('gera pares só das chaves marcadas', () => {
    const linhas = listarLinhasImpactoLote([grupoAdd, grupoRemover])
    const pares = montarParesImpactoLote(
      linhas,
      new Set(['g-add:c-bacon', 'g-rem:c-bacon', 'g-add:c-sal']),
      'nenhum'
    )
    expect(pares).toEqual([
      { grupoComplementoId: 'g-add', complementoId: 'c-bacon', tipoImpactoPreco: 'nenhum' },
      { grupoComplementoId: 'g-rem', complementoId: 'c-bacon', tipoImpactoPreco: 'nenhum' },
      { grupoComplementoId: 'g-add', complementoId: 'c-sal', tipoImpactoPreco: 'nenhum' },
    ])
  })

  it('ignora chave que não existe nas linhas', () => {
    const linhas = listarLinhasImpactoLote([grupoAdd])
    const pares = montarParesImpactoLote(linhas, new Set(['g-add:c-cal']), 'aumenta')
    expect(pares).toEqual([])
  })
})

describe('partirParesImpactoEmLotes', () => {
  it('parte em blocos de no máximo 100', () => {
    const pares = Array.from({ length: 101 }, (_, i) => ({
      grupoComplementoId: 'g',
      complementoId: `c-${i}`,
      tipoImpactoPreco: 'aumenta' as const,
    }))
    const lotes = partirParesImpactoEmLotes(pares)
    expect(lotes).toHaveLength(2)
    expect(lotes[0]).toHaveLength(100)
    expect(lotes[1]).toHaveLength(1)
  })
})
