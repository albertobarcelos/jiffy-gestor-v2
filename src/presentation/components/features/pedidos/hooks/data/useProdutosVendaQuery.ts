'use client'

import { useEffect, useMemo } from 'react'
import type { Produto as ProdutoEntity } from '@/src/domain/entities/Produto'
import {
  TAMANHO_PAGINA_CATALOGO_BUSCA,
  TAMANHO_PAGINA_CATALOGO_GRUPO,
  buscaCatalogoVendaAtiva,
  montarProdutosCatalogoVenda,
} from '@/src/domain/policies/pedido/CatalogoVendaPolicy'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { fetchProdutosCatalogoPagina } from '../../novoPedidoProdutosApi'

export type ProdutosCatalogoPagina = {
  produtos: ProdutoEntity[]
  count: number
  nextOffset: number | null
}

export type UseProdutosVendaQueryParams = {
  enabled: boolean
  token: string | undefined
  menuId: string | null
  grupoSelecionadoId: string | null
  buscaProdutoTexto: string
  onProdutosGrupoCarregados: (produtos: ProdutoEntity[]) => void
}

export function useProdutosVendaQuery({
  enabled,
  token,
  menuId,
  grupoSelecionadoId,
  buscaProdutoTexto,
  onProdutosGrupoCarregados,
}: UseProdutosVendaQueryParams) {
  const buscaProdutoFiltrada = buscaProdutoTexto.trim().toLowerCase()
  const catalogoHabilitado = enabled && !!menuId
  const emBusca = buscaCatalogoVendaAtiva(buscaProdutoFiltrada)

  const buscaQuery = useSecureTenantInfiniteQuery<ProdutosCatalogoPagina, number>(
    ['produtos-busca', menuId, buscaProdutoFiltrada, TAMANHO_PAGINA_CATALOGO_BUSCA],
    async ({ token: tenantToken }, offset) => {
      if (!menuId) {
        return { produtos: [], count: 0, nextOffset: null }
      }
      const page = await fetchProdutosCatalogoPagina(tenantToken, menuId, {
        q: buscaProdutoFiltrada,
        limit: TAMANHO_PAGINA_CATALOGO_BUSCA,
        offset,
      })
      return {
        produtos: page.produtos,
        count: page.count,
        nextOffset: page.hasMore ? offset + TAMANHO_PAGINA_CATALOGO_BUSCA : null,
      }
    },
    {
      enabled: !!token && catalogoHabilitado && emBusca,
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
    }
  )

  const grupoQuery = useSecureTenantInfiniteQuery<ProdutosCatalogoPagina, number>(
    ['produtos-por-grupo', menuId, grupoSelecionadoId, TAMANHO_PAGINA_CATALOGO_GRUPO],
    async ({ token: tenantToken }, offset) => {
      if (!grupoSelecionadoId || !menuId) {
        return { produtos: [], count: 0, nextOffset: null }
      }
      const page = await fetchProdutosCatalogoPagina(tenantToken, menuId, {
        grupoProdutoId: grupoSelecionadoId,
        limit: TAMANHO_PAGINA_CATALOGO_GRUPO,
        offset,
      })
      return {
        produtos: page.produtos,
        count: page.count,
        nextOffset: page.hasMore ? offset + TAMANHO_PAGINA_CATALOGO_GRUPO : null,
      }
    },
    {
      enabled: catalogoHabilitado && !!grupoSelecionadoId && !!token && !emBusca,
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 1,
    }
  )

  const produtosGrupo = useMemo(
    () => grupoQuery.data?.pages.flatMap(page => page.produtos) ?? [],
    [grupoQuery.data]
  )
  const produtosBusca = useMemo(
    () => buscaQuery.data?.pages.flatMap(page => page.produtos) ?? [],
    [buscaQuery.data]
  )

  useEffect(() => {
    if (!produtosGrupo.length) return
    onProdutosGrupoCarregados(produtosGrupo)
  }, [produtosGrupo, onProdutosGrupoCarregados])

  useEffect(() => {
    if (!produtosBusca.length) return
    onProdutosGrupoCarregados(produtosBusca)
  }, [produtosBusca, onProdutosGrupoCarregados])

  const produtosList = useMemo(
    () =>
      montarProdutosCatalogoVenda({
        menuId,
        buscaFiltrada: buscaProdutoFiltrada,
        produtosBusca,
        produtosGrupo,
      }),
    [menuId, buscaProdutoFiltrada, produtosBusca, produtosGrupo]
  )

  const catalogoAtivo = emBusca ? buscaQuery : grupoQuery
  const isLoadingAtual = emBusca ? buscaQuery.isLoading : grupoQuery.isLoading

  return {
    produtosList,
    buscaProdutoFiltrada,
    isLoadingProdutosVenda: !menuId ? false : isLoadingAtual,
    isLoadingBuscaProdutos: buscaQuery.isLoading,
    isLoadingProdutos: grupoQuery.isLoading,
    produtosError: emBusca ? buscaQuery.error : grupoQuery.error,
    hasNextProdutosCatalogo: Boolean(catalogoAtivo.hasNextPage),
    isFetchingNextProdutosCatalogo: catalogoAtivo.isFetchingNextPage,
    carregarProximaPaginaProdutosCatalogo: () => {
      if (!catalogoAtivo.hasNextPage || catalogoAtivo.isFetchingNextPage) return
      void catalogoAtivo.fetchNextPage()
    },
    menuCatalogoIndisponivel: enabled && !menuId,
  }
}
