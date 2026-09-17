import { describe, expect, it } from 'vitest'
import { Produto } from '@/src/domain/entities/Produto'
import {
  gruposComplementosPrecisamHidratacao,
  mapGrupoComplementoJsonToProdutoGrupo,
  mapMenuGruposComplementosToProduto,
  menuProdutoToProduto,
  mergeProdutoComSnapshotMenu,
} from '@/src/application/mappers/MenuProdutoCatalogMapper'
import type { MenuProduto } from '@/src/shared/types/menus'

function snapshotMenu(over: Partial<MenuProduto> = {}): MenuProduto {
  return {
    id: 'mp-1',
    nome: 'X-Bacon do cardápio',
    descricao: null,
    valor: 25,
    ordem: 1,
    favorito: false,
    ativo: true,
    menu: { id: 'menu-1', nome: 'Balcão' },
    produtoId: 'p1',
    grupoProduto: { id: 'cat-1', nome: 'Lanches' },
    image: null,
    gruposComplementos: [{ id: 'g-menu', nome: 'Extras do cardápio' }],
    dataCriacao: '',
    dataAtualizacao: '',
    ...over,
  }
}

function produtoCadastroComComplementos(): Produto {
  return Produto.fromJSON({
    id: 'p1',
    codigoProduto: 'XB01',
    nome: 'X-Bacon cadastro',
    valor: 20,
    ativo: true,
    abreComplementos: true,
    ncm: '21069090',
    unidadeMedida: 'UN',
    gruposComplementos: [
      {
        id: 'g-cadastro',
        nome: 'Extras do cadastro',
        complementos: [{ id: 'c-cadastro', nome: 'Bacon cadastro', valor: 2 }],
      },
    ],
  })
}

describe('MenuProdutoCatalogMapper — complementos do produto do menu', () => {
  it('leva os grupos do snapshot do menu, sem os itens quando a listagem é slim', () => {
    const produto = menuProdutoToProduto(snapshotMenu())
    const grupos = produto.getGruposComplementos()
    expect(grupos).toHaveLength(1)
    expect(grupos[0]?.id).toBe('g-menu')
    expect(grupos[0]?.complementos).toEqual([])
    expect(produto.abreComplementosAtivo()).toBe(true)
    expect(gruposComplementosPrecisamHidratacao(grupos)).toBe(true)
  })

  it('não usa os complementos do cadastro base no merge', () => {
    const merged = mergeProdutoComSnapshotMenu(
      produtoCadastroComComplementos(),
      snapshotMenu()
    )
    const grupos = merged.getGruposComplementos()
    expect(grupos.map(g => g.id)).toEqual(['g-menu'])
    expect(grupos.some(g => g.id === 'g-cadastro')).toBe(false)
    expect(merged.getCodigoProduto()).toBe('XB01')
    expect(merged.getNcm()).toBe('21069090')
    expect(merged.getNome()).toBe('X-Bacon do cardápio')
    expect(merged.getValor()).toBe(25)
  })

  it('fica sem grupos quando o produto do menu não tem vínculo, mesmo com cadastro preenchido', () => {
    const merged = mergeProdutoComSnapshotMenu(
      produtoCadastroComComplementos(),
      snapshotMenu({ gruposComplementos: [] })
    )
    expect(merged.getGruposComplementos()).toEqual([])
    expect(merged.abreComplementosAtivo()).toBe(false)
  })

  it('aproveita itens já aninhados no GET do produto do menu', () => {
    const produto = menuProdutoToProduto(
      snapshotMenu({
        gruposComplementos: [
          {
            id: 'g-menu',
            nome: 'Extras do cardápio',
            complementos: [{ id: 'c-menu', nome: 'Bacon do menu', valor: 4, tipoImpactoPreco: 'aumenta' }],
          },
        ],
      })
    )
    expect(produto.getGruposComplementos()[0]?.complementos).toEqual([
      { id: 'c-menu', nome: 'Bacon do menu', valor: 4, tipoImpactoPreco: 'aumenta' },
    ])
    expect(gruposComplementosPrecisamHidratacao(produto.getGruposComplementos())).toBe(false)
  })

  it('mapeia o GET do grupo de complementos para hidratar o produto do menu', () => {
    expect(
      mapGrupoComplementoJsonToProdutoGrupo({
        id: 'g-menu',
        nome: 'Extras do cardápio',
        complementos: [{ id: 'c-menu', nome: 'Bacon do menu', valor: 4 }],
      })
    ).toEqual({
      id: 'g-menu',
      nome: 'Extras do cardápio',
      complementos: [{ id: 'c-menu', nome: 'Bacon do menu', valor: 4, tipoImpactoPreco: 'nenhum' }],
    })
    expect(mapMenuGruposComplementosToProduto(undefined)).toEqual([])
  })
})
