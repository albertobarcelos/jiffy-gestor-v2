import { beforeEach, describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { Produto } from '@/src/domain/entities/Produto'
import { mapGrupoComplementoJsonToProdutoGrupo } from '@/src/application/mappers/MenuProdutoCatalogMapper'
import {
  gravarGruposComplementosNoCache,
  limparCacheGruposComplementosCatalogo,
  snapshotCacheGruposComplementosCatalogo,
} from '@/src/infrastructure/api/repositories/grupoComplementoCatalogoCache'
import {
  CATALOGO_VENDA_MENU_GRUPOS_KEY,
  CATALOGO_VENDA_PRODUTOS_BUSCA_KEY,
  CATALOGO_VENDA_PRODUTOS_POR_GRUPO_KEY,
  aplicarAvisoHidratacaoCatalogoVenda,
  invalidarCatalogoVendaQueries,
  refetchCatalogoVendaSeInvalidado,
} from '@/src/presentation/cache/catalogoVendaQueryCache'

describe('invalidarCatalogoVendaQueries', () => {
  beforeEach(() => {
    limparCacheGruposComplementosCatalogo()
    const doces = mapGrupoComplementoJsonToProdutoGrupo({
      id: 'g-doces',
      nome: 'Doces',
      qtdMinima: 2,
      qtdMaxima: 6,
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
  })

  it('campos simples invalida grade e busca, sem zerar grupos nem abas', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const empresaId = 'emp-1'
    const produtosKey = [
      'tenant',
      empresaId,
      CATALOGO_VENDA_PRODUTOS_POR_GRUPO_KEY,
      'menu-a',
      'lanches',
      40,
    ]
    const buscaKey = [
      'tenant',
      empresaId,
      CATALOGO_VENDA_PRODUTOS_BUSCA_KEY,
      'menu-a',
      'x-burger',
      20,
    ]
    const gruposKey = ['tenant', empresaId, CATALOGO_VENDA_MENU_GRUPOS_KEY, 'menu-a']
    const cadastroKey = ['tenant', empresaId, 'produtos-por-grupo', 'lanches']

    queryClient.setQueryData(produtosKey, { ok: true })
    queryClient.setQueryData(buscaKey, { ok: true })
    queryClient.setQueryData(gruposKey, { ok: true })
    queryClient.setQueryData(cadastroKey, { ok: true })

    invalidarCatalogoVendaQueries(queryClient, empresaId, {
      tipo: 'produto-campos-simples',
      produtoId: 'p1',
      menuIds: ['menu-a'],
    })
    await Promise.resolve()

    expect(snapshotCacheGruposComplementosCatalogo().has('g-doces')).toBe(true)
    expect(queryClient.getQueryState(produtosKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(buscaKey)?.isInvalidated).toBe(true)
    expect(queryClient.getQueryState(gruposKey)?.isInvalidated).toBe(false)
    expect(queryClient.getQueryState(cadastroKey)?.isInvalidated).toBe(false)
  })

  it('grupo de complemento só tira o grupo afetado do cache', () => {
    invalidarCatalogoVendaQueries(new QueryClient(), 'emp-1', {
      tipo: 'grupo-complemento',
      grupoComplementoId: 'g-doces',
    })
    const snap = snapshotCacheGruposComplementosCatalogo()
    expect(snap.has('g-doces')).toBe(false)
    expect(snap.has('g-add')).toBe(true)
  })

  it('sem empresaId ainda publica limpeza de cache de grupos', () => {
    invalidarCatalogoVendaQueries(new QueryClient(), null, {
      tipo: 'grupo-complemento',
      grupoComplementoId: 'g-doces',
    })
    expect(snapshotCacheGruposComplementosCatalogo().has('g-doces')).toBe(false)
    expect(snapshotCacheGruposComplementosCatalogo().has('g-add')).toBe(true)
  })

  it('refetch no mount só se a query foi invalidada', () => {
    expect(refetchCatalogoVendaSeInvalidado({ state: { isInvalidated: true } })).toBe(true)
    expect(refetchCatalogoVendaSeInvalidado({ state: { isInvalidated: false } })).toBe(false)
  })

  it('tira só o produto hidratado, ou os que usam o grupo/complemento', () => {
    const p1 = Produto.fromJSON({
      id: 'p1',
      codigoProduto: 'p1',
      nome: 'p1',
      valor: 10,
      ativo: true,
      gruposComplementos: [
        {
          id: 'doces',
          nome: 'Doces',
          qtdMinima: 0,
          qtdMaxima: 1,
          limitesDoCadastro: true,
          complementos: [{ id: 'c1', nome: 'item', valor: 1 }],
        },
      ],
    })
    const p2 = Produto.fromJSON({
      id: 'p2',
      codigoProduto: 'p2',
      nome: 'p2',
      valor: 10,
      ativo: true,
      gruposComplementos: [
        {
          id: 'add',
          nome: 'ADD',
          qtdMinima: 0,
          qtdMaxima: 1,
          limitesDoCadastro: true,
          complementos: [{ id: 'c2', nome: 'item', valor: 1 }],
        },
      ],
    })
    const catalogo = { p1, p2 }

    expect(aplicarAvisoHidratacaoCatalogoVenda(catalogo, { produtoIds: ['p1'] }).p1).toBeUndefined()
    expect(aplicarAvisoHidratacaoCatalogoVenda(catalogo, { produtoIds: ['p1'] }).p2).toBe(p2)
    expect(
      aplicarAvisoHidratacaoCatalogoVenda(catalogo, { grupoComplementoIds: ['doces'] }).p1
    ).toBeUndefined()
    expect(aplicarAvisoHidratacaoCatalogoVenda(catalogo, { complementoId: 'c1' }).p2).toBe(p2)
    expect(aplicarAvisoHidratacaoCatalogoVenda(catalogo, { limparTodos: true })).toEqual({})
  })
})
