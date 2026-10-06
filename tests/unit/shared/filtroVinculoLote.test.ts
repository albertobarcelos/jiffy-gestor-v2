import { describe, expect, it } from 'vitest'
import {
  filtrarCatalogoPorModoVinculo,
  intersecaoIdsVinculosDosAlvos,
  uniaoIdsVinculosDosAlvos,
} from '@/src/shared/helpers/filtroVinculoLote'

type Produto = { id: string; grupos: string[] }

const produtos: Produto[] = [
  { id: 'A', grupos: ['X', 'Y'] },
  { id: 'B', grupos: ['Y'] },
  { id: 'C', grupos: ['X', 'Y', 'Z'] },
]

const catalogo = ['X', 'Y', 'Z', 'W']

describe('intersecaoIdsVinculosDosAlvos', () => {
  it('mantém só o grupo presente em todos os produtos marcados', () => {
    const ids = intersecaoIdsVinculosDosAlvos(
      produtos,
      new Set(['A', 'B', 'C']),
      (p) => p.id,
      (p) => p.grupos
    )
    expect([...ids].sort()).toEqual(['Y'])
  })

  it('fica vazia quando um produto marcado não tem grupos', () => {
    const ids = intersecaoIdsVinculosDosAlvos(
      [...produtos, { id: 'D', grupos: [] }],
      new Set(['A', 'D']),
      (p) => p.id,
      (p) => p.grupos
    )
    expect(ids.size).toBe(0)
  })
})

describe('filtro de grupos no modo vincular', () => {
  it('esconde o grupo só quando todos os selecionados já o têm', () => {
    const intersecao = intersecaoIdsVinculosDosAlvos(
      produtos,
      new Set(['A', 'B']),
      (p) => p.id,
      (p) => p.grupos
    )
    const visiveis = filtrarCatalogoPorModoVinculo(
      catalogo,
      (id) => id,
      intersecao,
      'adicionar',
      true
    )
    expect(visiveis).toEqual(['X', 'Z', 'W'])
  })

  it('desvincular continua na união', () => {
    const uniao = uniaoIdsVinculosDosAlvos(
      produtos,
      new Set(['A', 'B']),
      (p) => p.id,
      (p) => p.grupos
    )
    const visiveis = filtrarCatalogoPorModoVinculo(
      catalogo,
      (id) => id,
      uniao,
      'remover',
      true
    )
    expect(visiveis).toEqual(['X', 'Y'])
  })
})
