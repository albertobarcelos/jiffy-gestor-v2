import { describe, expect, it, vi } from 'vitest'
import { Produto } from '@/src/domain/entities/Produto'
import {
  gruposComplementosPrecisamHidratacao,
  grupoTemLimitesDeCadastro,
  hidratarGruposComplementosComFontes,
  mapGrupoComplementoJsonToProdutoGrupo,
  mapMenuGruposComplementosToProduto,
  menuProdutoToProduto,
  mergeProdutoComSnapshotMenu,
  mesclarGrupoComplementoMenuComCadastro,
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
    fiscal: { ncm: '21069090' },
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
    expect(gruposComplementosPrecisamHidratacao(produto.getGruposComplementos())).toBe(true)
  })

  it('não hidrata de novo quando o snapshot já traz itens e limites do cadastro', () => {
    const produto = menuProdutoToProduto(
      snapshotMenu({
        gruposComplementos: [
          {
            id: 'g-menu',
            nome: 'Extras do cardápio',
            qtdMinima: 1,
            qtdMaxima: 3,
            complementos: [{ id: 'c-menu', nome: 'Bacon do menu', valor: 4, tipoImpactoPreco: 'aumenta' }],
          },
        ],
      })
    )
    const grupo = produto.getGruposComplementos()[0]
    expect(grupo?.qtdMinima).toBe(1)
    expect(grupo?.qtdMaxima).toBe(3)
    expect(grupo?.limitesDoCadastro).toBe(true)
    expect(gruposComplementosPrecisamHidratacao(produto.getGruposComplementos())).toBe(false)
  })

  it('mapeia o GET do grupo de complementos para hidratar o produto do menu', () => {
    expect(
      mapGrupoComplementoJsonToProdutoGrupo({
        id: 'g-menu',
        nome: 'Extras do cardápio',
        qtdMinima: 1,
        qtdMaxima: 2,
        complementos: [{ id: 'c-menu', nome: 'Bacon do menu', valor: 4 }],
      })
    ).toEqual({
      id: 'g-menu',
      nome: 'Extras do cardápio',
      qtdMinima: 1,
      qtdMaxima: 2,
      limitesDoCadastro: true,
      complementos: [{ id: 'c-menu', nome: 'Bacon do menu', valor: 4, tipoImpactoPreco: 'nenhum' }],
    })
    expect(mapMenuGruposComplementosToProduto(undefined)).toEqual([])
  })

  it('reaproveita itens e limites do cadastro quando o menu veio slim', () => {
    const menu = mapMenuGruposComplementosToProduto([{ id: 'g-doces', nome: 'Doces' }])[0]
    const cadastro = mapGrupoComplementoJsonToProdutoGrupo({
      id: 'g-doces',
      nome: 'Doces cadastro',
      qtdMinima: 2,
      qtdMaxima: 6,
      complementos: [{ id: 'c1', nome: 'chocomenta', valor: 5 }],
    })
    expect(menu).toBeTruthy()
    expect(cadastro).toBeTruthy()
    const mesclado = mesclarGrupoComplementoMenuComCadastro(menu!, cadastro!)
    expect(mesclado.nome).toBe('Doces')
    expect(mesclado.qtdMinima).toBe(2)
    expect(mesclado.qtdMaxima).toBe(6)
    expect(mesclado.limitesDoCadastro).toBe(true)
    expect(mesclado.complementos).toHaveLength(1)
    expect(gruposComplementosPrecisamHidratacao([mesclado])).toBe(false)
  })

  it('não infere limites de um snapshot slim com flag false', () => {
    expect(grupoTemLimitesDeCadastro({ id: 'g1', nome: 'Doces' })).toBe(false)
    expect(grupoTemLimitesDeCadastro({ qtdMinima: 0, qtdMaxima: 0 })).toBe(true)
    expect(
      grupoTemLimitesDeCadastro({ qtdMinima: 0, qtdMaxima: 0, limitesDoCadastro: false })
    ).toBe(false)
  })

  it('hidrata pelo cache sem chamar GET', async () => {
    const slim = menuProdutoToProduto(
      snapshotMenu({ gruposComplementos: [{ id: 'g-doces', nome: 'Doces' }] })
    )
    const cached = mapGrupoComplementoJsonToProdutoGrupo({
      id: 'g-doces',
      nome: 'Doces',
      qtdMinima: 2,
      qtdMaxima: 6,
      complementos: [{ id: 'c1', nome: 'chocomenta', valor: 5 }],
    })
    const buscarGrupo = vi.fn()
    const { produto, gruposCompletos } = await hidratarGruposComplementosComFontes(
      slim,
      { cachePorId: new Map([['g-doces', cached!]]) },
      buscarGrupo
    )
    expect(buscarGrupo).not.toHaveBeenCalled()
    expect(produto.getGruposComplementos()[0]?.complementos).toHaveLength(1)
    expect(gruposCompletos).toHaveLength(1)
  })

  it('busca só o grupo que falta no cache e reusa o outro', async () => {
    const slim = menuProdutoToProduto(
      snapshotMenu({
        gruposComplementos: [
          { id: 'g-doces', nome: 'Doces' },
          { id: 'g-add', nome: 'ADD' },
        ],
      })
    )
    const cachedDoces = mapGrupoComplementoJsonToProdutoGrupo({
      id: 'g-doces',
      nome: 'Doces',
      qtdMinima: 2,
      qtdMaxima: 6,
      complementos: [{ id: 'c1', nome: 'chocomenta', valor: 5 }],
    })
    const buscarGrupo = vi.fn(async (id: string) =>
      mapGrupoComplementoJsonToProdutoGrupo({
        id,
        nome: 'ADD',
        qtdMinima: 1,
        qtdMaxima: 3,
        complementos: [{ id: 'c2', nome: 'MOSTARDA', valor: 0 }],
      })
    )
    const { produto } = await hidratarGruposComplementosComFontes(
      slim,
      { cachePorId: new Map([['g-doces', cachedDoces!]]) },
      buscarGrupo
    )
    expect(buscarGrupo).toHaveBeenCalledTimes(1)
    expect(buscarGrupo).toHaveBeenCalledWith('g-add')
    expect(produto.getGruposComplementos().map(g => g.id)).toEqual(['g-doces', 'g-add'])
    expect(produto.getGruposComplementos()[1]?.complementos[0]?.nome).toBe('MOSTARDA')
  })
})
