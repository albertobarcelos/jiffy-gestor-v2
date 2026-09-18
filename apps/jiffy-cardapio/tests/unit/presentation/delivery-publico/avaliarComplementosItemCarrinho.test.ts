import { describe, expect, it } from 'vitest'
import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoProdutoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import {
  avaliarComplementosItemCarrinho,
  type ComplementosCatalogoCache,
  type ComplementoQuantidadeCarrinho,
} from '@/src/presentation/components/features/delivery-publico/shared/utils/produtoComplementosUtils'

function grupo(
  overrides: Partial<CatalogoPublicoGrupoComplementoDTO> &
    Pick<CatalogoPublicoGrupoComplementoDTO, 'id' | 'qtdMinima' | 'qtdMaxima' | 'obrigatorio'>
): CatalogoPublicoGrupoComplementoDTO {
  return {
    nome: 'Adicionais',
    imagemUrl: null,
    ordem: 1,
    complementoIds: ['comp-1'],
    ...overrides,
  }
}

function complemento(id: string): CatalogoPublicoComplementoDTO {
  return {
    id,
    nome: id,
    descricao: null,
    imagemUrl: null,
    valor: 1,
    tipoImpactoPreco: 'soma',
  }
}

function produto(
  grupoComplementosIds: string[],
  abreComplementos = true
): CatalogoPublicoProdutoDTO {
  return {
    id: 'prod-1',
    nome: 'Pastel',
    valor: 10,
    descricao: null,
    imagemUrl: null,
    ordem: 1,
    unidadeMedida: 'un',
    favorito: false,
    abreComplementos,
    grupoComplementosIds,
  }
}

function cacheDe(grupoComplemento: CatalogoPublicoGrupoComplementoDTO): ComplementosCatalogoCache {
  return {
    gruposComplementos: [grupoComplemento],
    complementos: grupoComplemento.complementoIds.map(complemento),
  }
}

function avaliar(
  grupoComplemento: CatalogoPublicoGrupoComplementoDTO,
  complementos: ComplementoQuantidadeCarrinho[]
) {
  return avaliarComplementosItemCarrinho({
    produto: produto([grupoComplemento.id]),
    cache: cacheDe(grupoComplemento),
    produtoNome: 'Pastel',
    complementos,
  })
}

describe('avaliarComplementosItemCarrinho', () => {
  it('bloqueia zerar um grupo com mínimo 1', () => {
    const resultado = avaliar(
      grupo({ id: 'g1', qtdMinima: 1, qtdMaxima: 0, obrigatorio: true }),
      []
    )

    expect(resultado.status).toBe('invalido')
    if (resultado.status !== 'invalido') return
    expect(resultado.pendentes).toEqual([
      expect.objectContaining({
        id: 'g1',
        quantidadeMinima: 1,
        quantidadeSelecionada: 0,
      }),
    ])
  })

  it('deixa remover quando o grupo não é obrigatório e o mínimo é 0', () => {
    const resultado = avaliar(
      grupo({ id: 'g1', qtdMinima: 0, qtdMaxima: 0, obrigatorio: false }),
      []
    )

    expect(resultado).toEqual({ status: 'ok' })
  })

  it('exige 1 quando o grupo é obrigatório mesmo com mínimo 0', () => {
    const resultado = avaliar(
      grupo({ id: 'g1', qtdMinima: 0, qtdMaxima: 0, obrigatorio: true }),
      []
    )

    expect(resultado.status).toBe('invalido')
    if (resultado.status !== 'invalido') return
    expect(resultado.pendentes[0]?.quantidadeMinima).toBe(1)
  })

  it('não bloqueia máximo 0, mesmo com várias unidades', () => {
    const resultado = avaliar(
      grupo({ id: 'g1', qtdMinima: 0, qtdMaxima: 0, obrigatorio: false }),
      [{ complementoId: 'comp-1', grupoComplementoId: 'g1', quantidade: 3 }]
    )

    expect(resultado).toEqual({ status: 'ok' })
  })

  it('bloqueia quando a quantidade passa do máximo', () => {
    const resultado = avaliar(
      grupo({ id: 'g1', qtdMinima: 0, qtdMaxima: 2, obrigatorio: false }),
      [{ complementoId: 'comp-1', grupoComplementoId: 'g1', quantidade: 3 }]
    )

    expect(resultado.status).toBe('invalido')
    if (resultado.status !== 'invalido') return
    expect(resultado.acimaDoMaximo).toEqual([
      expect.objectContaining({
        id: 'g1',
        quantidadeMaxima: 2,
        quantidadeSelecionada: 3,
      }),
    ])
  })

  it('fica indefinido sem o produto no catálogo', () => {
    const resultado = avaliarComplementosItemCarrinho({
      produto: null,
      cache: null,
      produtoNome: 'Pastel',
      complementos: [],
    })

    expect(resultado).toEqual({ status: 'indefinido' })
  })

  it('fica indefinido sem o cache de grupos de um produto que abre complementos', () => {
    const resultado = avaliarComplementosItemCarrinho({
      produto: produto(['g1']),
      cache: null,
      produtoNome: 'Pastel',
      complementos: [],
    })

    expect(resultado).toEqual({ status: 'indefinido' })
  })

  it('aceita produto sem complementos mesmo sem cache', () => {
    const resultado = avaliarComplementosItemCarrinho({
      produto: produto([], false),
      cache: null,
      produtoNome: 'Pastel',
      complementos: [],
    })

    expect(resultado).toEqual({ status: 'ok' })
  })
})
