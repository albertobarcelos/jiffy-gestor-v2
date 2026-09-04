import { describe, expect, it } from 'vitest'
import type { CatalogoPublicoGrupoProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { buildCatalogViewModel } from '@/src/presentation/components/features/delivery-publico/shared/mappers/buildCatalogViewModel'
import {
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID,
  DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
} from '@/src/presentation/components/features/delivery-publico/shared/constants/deliveryPublicoSugestoes'

function produtoBase(
  overrides: Partial<CatalogoPublicoGrupoProdutoDTO['produtos'][number]> & {
    id: string
    nome: string
  }
): CatalogoPublicoGrupoProdutoDTO['produtos'][number] {
  return {
    valor: 10,
    descricao: null,
    imagemUrl: null,
    ordem: 1,
    unidadeMedida: 'UN',
    favorito: false,
    abreComplementos: false,
    grupoComplementosIds: [],
    ...overrides,
  }
}

function grupoBase(
  overrides: Partial<CatalogoPublicoGrupoProdutoDTO> & {
    id: string
    nome: string
    produtos: CatalogoPublicoGrupoProdutoDTO['produtos']
  }
): CatalogoPublicoGrupoProdutoDTO {
  return {
    imagemUrl: null,
    cor: '#000000',
    icone: 'food',
    ordem: 1,
    ...overrides,
  }
}

describe('buildCatalogViewModel — grupo Sugestões', () => {
  it('não injeta Sugestões sem grupo real, mesmo com favoritos', () => {
    const grupos = [
      grupoBase({
        id: 'g1',
        nome: 'Bebidas',
        produtos: [produtoBase({ id: 'p1', nome: 'Suco', favorito: true })],
      }),
    ]

    const vm = buildCatalogViewModel(grupos)

    expect(vm.grupos).toHaveLength(1)
    expect(vm.grupos[0]?.id).toBe('g1')
  })

  it('não injeta Sugestões com grupo real mas sem favoritos', () => {
    const grupos = [
      grupoBase({
        id: 'sug',
        nome: DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
        imagemUrl: 'https://cdn.example/banner.jpg',
        produtos: [],
      }),
      grupoBase({
        id: 'g1',
        nome: 'Bebidas',
        produtos: [produtoBase({ id: 'p1', nome: 'Suco', favorito: false })],
      }),
    ]

    const vm = buildCatalogViewModel(grupos)

    expect(vm.grupos.every(g => g.id !== DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)).toBe(true)
    expect(vm.grupos.every(g => g.id !== 'sug')).toBe(true)
    expect(vm.grupos).toHaveLength(1)
  })

  it('injeta Sugestões com imagem do grupo real e omite o grupo da lista', () => {
    const grupos = [
      grupoBase({
        id: 'sug',
        nome: 'sugestões da casa',
        imagemUrl: 'https://cdn.example/banner.jpg',
        produtos: [],
      }),
      grupoBase({
        id: 'g1',
        nome: 'Lanches',
        ordem: 1,
        produtos: [
          produtoBase({ id: 'p1', nome: 'X-Burger', ordem: 2, favorito: true }),
          produtoBase({ id: 'p2', nome: 'X-Salada', ordem: 1, favorito: false }),
        ],
      }),
      grupoBase({
        id: 'g2',
        nome: 'Bebidas',
        ordem: 2,
        produtos: [produtoBase({ id: 'p3', nome: 'Refri', ordem: 1, favorito: true })],
      }),
    ]

    const vm = buildCatalogViewModel(grupos)

    expect(vm.grupos[0]?.id).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)
    expect(vm.grupos[0]?.nome).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME)
    expect(vm.grupos[0]?.imagemUrl).toBe('https://cdn.example/banner.jpg')
    expect(vm.grupos[0]?.produtos.map(p => p.id)).toEqual(['p3', 'p1'])
    expect(vm.grupos.some(g => g.id === 'sug')).toBe(false)
    expect(vm.grupos).toHaveLength(3)
  })

  it('mantém favoritos também no grupo original e grupoId de origem', () => {
    const grupos = [
      grupoBase({
        id: 'sug',
        nome: DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME,
        produtos: [],
      }),
      grupoBase({
        id: 'g-origem',
        nome: 'Pratos',
        produtos: [produtoBase({ id: 'fav-1', nome: 'Prato A', favorito: true })],
      }),
    ]

    const vm = buildCatalogViewModel(grupos)
    const sugestoes = vm.grupos[0]
    const origem = vm.grupos[1]

    expect(sugestoes?.id).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)
    expect(sugestoes?.produtos[0]?.grupoId).toBe('g-origem')
    expect(origem?.id).toBe('g-origem')
    expect(origem?.produtos.map(p => p.id)).toEqual(['fav-1'])
  })

  it('reconhece carrier sem acento e em maiúsculas e exibe nome com acento', () => {
    const grupos = [
      grupoBase({
        id: 'sug',
        nome: 'SUGESTOES DA CASA',
        imagemUrl: 'https://cdn.example/banner.jpg',
        produtos: [],
      }),
      grupoBase({
        id: 'g1',
        nome: 'Lanches',
        produtos: [produtoBase({ id: 'p1', nome: 'X', favorito: true })],
      }),
    ]

    const vm = buildCatalogViewModel(grupos)

    expect(vm.grupos[0]?.id).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID)
    expect(vm.grupos[0]?.nome).toBe(DELIVERY_PUBLICO_GRUPO_SUGESTOES_NOME)
    expect(vm.grupos[0]?.imagemUrl).toBe('https://cdn.example/banner.jpg')
    expect(vm.grupos.some(g => g.id === 'sug')).toBe(false)
  })
})
