import { beforeEach, describe, expect, it } from 'vitest'
import { mapGrupoComplementoJsonToProdutoGrupo } from '@/src/application/mappers/MenuProdutoCatalogMapper'
import {
  gravarGruposComplementosNoCache,
  limparCacheGruposComplementosCatalogo,
  removerGruposComplementosDoCache,
  removerGruposComplementosDoCachePorComplementoId,
  snapshotCacheGruposComplementosCatalogo,
} from '@/src/infrastructure/api/repositories/grupoComplementoCatalogoCache'

describe('grupoComplementoCatalogoCache', () => {
  beforeEach(() => {
    limparCacheGruposComplementosCatalogo()
  })

  it('grava só grupos completos e limpa no reset', () => {
    const completo = mapGrupoComplementoJsonToProdutoGrupo({
      id: 'g-doces',
      nome: 'Doces',
      qtdMinima: 2,
      qtdMaxima: 6,
      complementos: [{ id: 'c1', nome: 'chocomenta', valor: 5 }],
    })
    gravarGruposComplementosNoCache([
      completo!,
      { id: 'g-slim', nome: 'Slim', qtdMinima: 0, qtdMaxima: 0, limitesDoCadastro: false, complementos: [] },
    ])

    const snap = snapshotCacheGruposComplementosCatalogo()
    expect(snap.has('g-doces')).toBe(true)
    expect(snap.has('g-slim')).toBe(false)

    limparCacheGruposComplementosCatalogo()
    expect(snapshotCacheGruposComplementosCatalogo().size).toBe(0)
  })

  it('remove grupos por id e por complemento sem limpar o resto', () => {
    const doces = mapGrupoComplementoJsonToProdutoGrupo({
      id: 'g-doces',
      nome: 'Doces',
      qtdMinima: 1,
      qtdMaxima: 2,
      complementos: [{ id: 'c1', nome: 'chocomenta', valor: 5 }],
    })
    const add = mapGrupoComplementoJsonToProdutoGrupo({
      id: 'g-add',
      nome: 'ADD',
      qtdMinima: 0,
      qtdMaxima: 3,
      complementos: [{ id: 'c2', nome: 'bacon', valor: 2 }],
    })
    gravarGruposComplementosNoCache([doces!, add!])

    removerGruposComplementosDoCachePorComplementoId('c1')
    expect(snapshotCacheGruposComplementosCatalogo().has('g-doces')).toBe(false)
    expect(snapshotCacheGruposComplementosCatalogo().has('g-add')).toBe(true)

    removerGruposComplementosDoCache(['g-add'])
    expect(snapshotCacheGruposComplementosCatalogo().size).toBe(0)
  })
})
