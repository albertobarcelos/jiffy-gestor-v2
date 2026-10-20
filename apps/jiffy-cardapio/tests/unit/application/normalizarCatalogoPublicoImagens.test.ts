import { describe, expect, it } from 'vitest'
import {
  extrairImagemUrlMidia,
  normalizarCatalogoPublicoImagens,
} from '@/src/application/mappers/normalizarCatalogoPublicoImagens'
import type { GetCatalogoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

function catalogoBase(
  over: Partial<GetCatalogoPublicoResponseDTO['catalogo']> = {}
): GetCatalogoPublicoResponseDTO {
  return {
    empresa: {
      id: 'e1',
      nomeFantasia: 'Loja',
      slug: 'loja',
      telefone: null,
      segmento: null,
      logoUrl: null,
      bannerUrl: null,
      endereco: null,
    },
    funcionamento: {} as GetCatalogoPublicoResponseDTO['funcionamento'],
    catalogo: {
      gruposProdutos: [],
      gruposComplementos: [],
      complementos: [],
      paginacao: {
        count: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
      ...over,
    },
  } as GetCatalogoPublicoResponseDTO
}

describe('extrairImagemUrlMidia', () => {
  it('lê image.imageUrl', () => {
    expect(
      extrairImagemUrlMidia({
        id: 'c1',
        imagemUrl: null,
        image: { imageUrl: ' https://cdn/comp.jpg ' },
      })
    ).toBe('https://cdn/comp.jpg')
  })
})

describe('normalizarCatalogoPublicoImagens', () => {
  it('preenche imagemUrl do complemento a partir de image.imageUrl', () => {
    const result = normalizarCatalogoPublicoImagens(
      catalogoBase({
        complementos: [
          {
            id: 'c1',
            nome: 'Bacon',
            descricao: null,
            imagemUrl: null,
            valor: 2,
            tipoImpactoPreco: 'aumenta',
            image: { imageUrl: 'https://cdn/bacon.jpg' },
          } as never,
        ],
      })
    )
    expect(result.catalogo.complementos?.[0]?.imagemUrl).toBe('https://cdn/bacon.jpg')
  })

  it('garante gruposComplementos lean no produto quando o payload omite o campo', () => {
    const result = normalizarCatalogoPublicoImagens(
      catalogoBase({
        gruposProdutos: [
          {
            id: 'gp1',
            nome: 'Lanches',
            imagemUrl: null,
            cor: '#000',
            icone: 'food',
            ordem: 1,
            produtos: [
              {
                id: 'p1',
                nome: 'Burger',
                valor: 10,
                descricao: null,
                imagemUrl: null,
                ordem: 1,
                unidadeMedida: 'un',
                favorito: false,
                abreComplementos: true,
                grupoComplementosIds: ['g1'],
              } as never,
            ],
          },
        ],
      })
    )
    expect(result.catalogo.gruposProdutos[0]?.produtos[0]?.gruposComplementos).toEqual([])
  })
})
