import { describe, expect, it } from 'vitest'
import { Produto } from '@/src/domain/entities/Produto'
import {
  aplicarPermissoesCadastroNoProdutoCatalogo,
  cacheProdutoCatalogoAtendePedido,
  catalogoPermiteHidratacaoSomenteGrupos,
  produtoTemComplementosCarregados,
  produtoTemIdsGruposComplementoParaHidratacao,
} from '@/src/domain/policies/pedido/CarrinhoCatalogoPolicy'
import type { MenuProdutoPermissoes } from '@/src/shared/utils/menuProdutoPermissoes'

function produtoSlim(params?: { abreComplementos?: boolean }): Produto {
  return Produto.fromJSON({
    id: 'p1',
    codigoProduto: 'p1',
    nome: 'X-Bacon',
    valor: 20,
    ativo: true,
    abreComplementos: params?.abreComplementos ?? false,
    gruposComplementos: [],
  })
}

function produtoSlimComGrupos(): Produto {
  return Produto.fromJSON({
    id: 'p1',
    codigoProduto: 'p1',
    nome: 'X-Bacon',
    valor: 20,
    ativo: true,
    abreComplementos: true,
    gruposComplementos: [
      {
        id: 'g1',
        nome: 'Extras',
        limitesDoCadastro: false,
        complementos: [],
      },
    ],
  })
}

function produtoComComplementos(): Produto {
  return Produto.fromJSON({
    id: 'p1',
    codigoProduto: 'p1',
    nome: 'X-Bacon',
    valor: 20,
    ativo: true,
    abreComplementos: true,
    gruposComplementos: [
      {
        id: 'g1',
        nome: 'Extras',
        qtdMinima: 0,
        qtdMaxima: 3,
        complementos: [{ id: 'c1', nome: 'Bacon extra', valor: 3 }],
      },
    ],
  })
}

const permissoesCadastro: MenuProdutoPermissoes = {
  permiteAcrescimo: false,
  permiteDesconto: false,
  abreComplementos: true,
  permiteAlterarPreco: false,
  incideTaxa: true,
}

describe('CarrinhoCatalogoPolicy — complementos da venda', () => {
  it('considera snapshot da grade sem itens de complemento', () => {
    expect(produtoTemComplementosCarregados(produtoSlim())).toBe(false)
    expect(produtoTemComplementosCarregados(produtoComComplementos())).toBe(true)
  })

  it('não considera carregado quando há itens mas os limites do cadastro ainda não vieram', () => {
    const semLimites = Produto.fromJSON({
      id: 'p1',
      codigoProduto: 'p1',
      nome: 'X-Bacon',
      valor: 20,
      ativo: true,
      abreComplementos: true,
      gruposComplementos: [
        {
          id: 'g1',
          nome: 'Extras',
          limitesDoCadastro: false,
          complementos: [{ id: 'c1', nome: 'Bacon extra', valor: 3 }],
        },
      ],
    })
    expect(produtoTemComplementosCarregados(semLimites)).toBe(false)
    expect(cacheProdutoCatalogoAtendePedido(semLimites, { requireComplementos: true })).toBe(false)
  })

  it('não reutiliza cache slim quando o painel precisa dos complementos', () => {
    const slim = produtoSlim({ abreComplementos: true })
    expect(cacheProdutoCatalogoAtendePedido(slim)).toBe(true)
    expect(cacheProdutoCatalogoAtendePedido(slim, { requireComplementos: true })).toBe(false)
    expect(
      cacheProdutoCatalogoAtendePedido(produtoComComplementos(), { requireComplementos: true })
    ).toBe(true)
    expect(cacheProdutoCatalogoAtendePedido(slim, { forceRefresh: true })).toBe(false)
    expect(cacheProdutoCatalogoAtendePedido(undefined, { requireComplementos: true })).toBe(false)
  })

  it('permite hidratar só os grupos quando a grade já trouxe os ids', () => {
    expect(produtoTemIdsGruposComplementoParaHidratacao(produtoSlimComGrupos())).toBe(true)
    expect(produtoTemIdsGruposComplementoParaHidratacao(produtoSlim())).toBe(false)
    expect(
      catalogoPermiteHidratacaoSomenteGrupos(produtoSlimComGrupos(), {
        requireComplementos: true,
      })
    ).toBe(true)
    expect(
      catalogoPermiteHidratacaoSomenteGrupos(produtoSlim(), { requireComplementos: true })
    ).toBe(false)
    expect(catalogoPermiteHidratacaoSomenteGrupos(produtoSlimComGrupos())).toBe(false)
    expect(
      catalogoPermiteHidratacaoSomenteGrupos(produtoComComplementos(), {
        requireComplementos: true,
      })
    ).toBe(false)
    expect(
      catalogoPermiteHidratacaoSomenteGrupos(produtoSlimComGrupos(), {
        requireComplementos: true,
        forceRefresh: true,
      })
    ).toBe(false)
  })

  it('não sobrescreve abreComplementos do produto do menu com o cadastro', () => {
    const slim = produtoSlim()
    expect(slim.abreComplementosAtivo()).toBe(false)
    const aplicado = aplicarPermissoesCadastroNoProdutoCatalogo(slim, permissoesCadastro)
    expect(aplicado.abreComplementosAtivo()).toBe(false)
    expect(aplicado.incideTaxaAtivo()).toBe(true)
  })

  it('não apaga grupos já hidratados ao aplicar flags do índice', () => {
    const completo = produtoComComplementos()
    const aplicado = aplicarPermissoesCadastroNoProdutoCatalogo(completo, {
      ...permissoesCadastro,
      abreComplementos: false,
    })
    expect(aplicado).toBe(completo)
    expect(aplicado.getGruposComplementos()[0]?.complementos).toHaveLength(1)
  })
})
