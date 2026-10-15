import { describe, expect, it } from 'vitest'
import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoProdutoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  cacheComplementosCobreProduto,
  produtoTemComplementosAtivos,
  resolveGruposComplementos,
  type ComplementosCatalogoCache,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/produtoComplementosUtils'

const templateGrupoAdd: CatalogoPublicoGrupoComplementoDTO = {
  id: 'g-add',
  nome: 'ADD',
  imagemUrl: null,
  obrigatorio: false,
  qtdMinima: 0,
  qtdMaxima: 5,
  ordem: 99,
  complementoIds: ['c-bacon', 'c-sal'],
}

const templateGrupoRem: CatalogoPublicoGrupoComplementoDTO = {
  id: 'g-rem',
  nome: 'REMOVER',
  imagemUrl: null,
  obrigatorio: false,
  qtdMinima: 0,
  qtdMaxima: 3,
  ordem: 1,
  complementoIds: ['c-bacon'],
}

const templates: CatalogoPublicoComplementoDTO[] = [
  {
    id: 'c-bacon',
    nome: 'Bacon',
    descricao: null,
    imagemUrl: null,
    valor: 1,
    tipoImpactoPreco: 'aumenta',
  },
  {
    id: 'c-sal',
    nome: 'SAL',
    descricao: null,
    imagemUrl: null,
    valor: 0,
    tipoImpactoPreco: 'nenhum',
  },
]

const cache: ComplementosCatalogoCache = {
  gruposComplementos: [templateGrupoAdd, templateGrupoRem],
  complementos: templates,
}

function produtoBase(
  over: Partial<CatalogoPublicoProdutoDTO> = {}
): CatalogoPublicoProdutoDTO {
  return {
    id: 'prod-1',
    nome: 'Burger',
    valor: 20,
    descricao: null,
    imagemUrl: null,
    ordem: 1,
    unidadeMedida: 'un',
    favorito: false,
    abreComplementos: true,
    grupoComplementosIds: ['g-add', 'g-rem'],
    gruposComplementos: [],
    ...over,
  }
}

describe('resolveGruposComplementos', () => {
  it('usa lean do produto para valor, impacto, ordem e filtra pausados', () => {
    const grupos = resolveGruposComplementos(
      cache,
      produtoBase({
        gruposComplementos: [
          {
            id: 'g-rem',
            ordem: 2,
            complementos: [
              {
                id: 'c-bacon',
                valor: 4,
                ativo: true,
                ordem: 1,
                tipoImpactoPreco: 'diminui',
              },
            ],
          },
          {
            id: 'g-add',
            ordem: 1,
            complementos: [
              {
                id: 'c-sal',
                valor: 2.5,
                ativo: true,
                ordem: 2,
                tipoImpactoPreco: 'aumenta',
              },
              {
                id: 'c-bacon',
                valor: 9,
                ativo: false,
                ordem: 1,
                tipoImpactoPreco: 'aumenta',
              },
            ],
          },
        ],
      })
    )

    expect(grupos.map(g => g.id)).toEqual(['g-add', 'g-rem'])
    expect(grupos[0]?.ordem).toBe(1)
    expect(grupos[0]?.complementos.map(c => c.id)).toEqual(['c-sal'])
    expect(grupos[0]?.complementos[0]).toMatchObject({
      nome: 'SAL',
      valor: 2.5,
      tipoImpactoPreco: 'aumenta',
    })
    expect(grupos[1]?.complementos[0]).toMatchObject({
      id: 'c-bacon',
      valor: 4,
      tipoImpactoPreco: 'diminui',
    })
  })

  it('sem lean, faz fallback pelo dicionário e grupoComplementosIds', () => {
    const grupos = resolveGruposComplementos(
      cache,
      produtoBase({
        grupoComplementosIds: ['g-add'],
        gruposComplementos: [],
      })
    )

    expect(grupos).toHaveLength(1)
    expect(grupos[0]?.id).toBe('g-add')
    expect(grupos[0]?.complementos.map(c => c.id)).toEqual(['c-bacon', 'c-sal'])
    expect(grupos[0]?.complementos[0]?.valor).toBe(1)
  })

  it('ignora grupo lean sem metadados no dicionário', () => {
    const grupos = resolveGruposComplementos(
      cache,
      produtoBase({
        gruposComplementos: [
          {
            id: 'g-desconhecido',
            ordem: 1,
            complementos: [
              {
                id: 'c-bacon',
                valor: 3,
                ativo: true,
                ordem: 1,
                tipoImpactoPreco: 'aumenta',
              },
            ],
          },
        ],
      })
    )
    expect(grupos).toEqual([])
  })
})

describe('produtoTemComplementosAtivos / cacheComplementosCobreProduto', () => {
  it('com lean só pausado, não considera que há complementos ativos', () => {
    const produto = produtoBase({
      gruposComplementos: [
        {
          id: 'g-add',
          ordem: 1,
          complementos: [
            {
              id: 'c-bacon',
              valor: 1,
              ativo: false,
              ordem: 1,
              tipoImpactoPreco: 'aumenta',
            },
          ],
        },
      ],
    })
    expect(produtoTemComplementosAtivos(produto)).toBe(false)
    expect(cacheComplementosCobreProduto(cache, produto)).toBe(true)
  })

  it('com lean ativo e cache cobrindo o grupo, cobre o produto', () => {
    const produto = produtoBase({
      gruposComplementos: [
        {
          id: 'g-add',
          ordem: 1,
          complementos: [
            {
              id: 'c-bacon',
              valor: 3,
              ativo: true,
              ordem: 1,
              tipoImpactoPreco: 'aumenta',
            },
          ],
        },
      ],
    })
    expect(produtoTemComplementosAtivos(produto)).toBe(true)
    expect(cacheComplementosCobreProduto(cache, produto)).toBe(true)
    expect(cacheComplementosCobreProduto(null, produto)).toBe(false)
  })
})
