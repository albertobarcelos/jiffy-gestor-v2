'use client'

import { useEffect, useMemo } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import type { Produto as ProdutoEntity } from '@/src/domain/entities/Produto'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchProdutosDoGrupo, fetchProdutosPorNomeBusca } from '../../novoPedidoProdutosApi'

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

  const { data: produtosBuscadosData, isLoading: isLoadingBuscaProdutos } = useSecureTenantQuery(
    ['produtos-busca', menuId, buscaProdutoFiltrada],
    async ({ token: tenantToken }) => {
      const produtos = await fetchProdutosPorNomeBusca(
        buscaProdutoFiltrada,
        tenantToken,
        menuId
      )
      return { produtos }
    },
    {
      enabled: !!token && catalogoHabilitado && buscaProdutoFiltrada.length >= 2,
      staleTime: 1000 * 60 * 5,
    }
  )

  const {
    data: produtosPorGrupoData,
    isLoading: isLoadingProdutos,
    error: produtosError,
  } = useSecureTenantQuery(
    ['produtos-por-grupo', menuId, grupoSelecionadoId],
    async ({ token: tenantToken }) => {
      if (!grupoSelecionadoId || !menuId) {
        return { produtos: [] as Produto[], count: 0 }
      }
      return fetchProdutosDoGrupo(grupoSelecionadoId, tenantToken, menuId)
    },
    {
      enabled: catalogoHabilitado && !!grupoSelecionadoId && !!token,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 1,
    }
  )

  useEffect(() => {
    if (!produtosPorGrupoData?.produtos?.length) return
    onProdutosGrupoCarregados(produtosPorGrupoData.produtos)
  }, [produtosPorGrupoData, onProdutosGrupoCarregados])

  const produtosList = useMemo(() => {
    if (!menuId) return []

    if (buscaProdutoFiltrada.length >= 2) {
      if (!produtosBuscadosData?.produtos) return []
      return [...produtosBuscadosData.produtos]
        .filter(p => p.isAtivo())
        .sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR'))
    }

    if (!produtosPorGrupoData?.produtos) return []
    return [...produtosPorGrupoData.produtos]
      .filter(p => p.isAtivo())
      .sort((a, b) => a.getNome().localeCompare(b.getNome(), 'pt-BR'))
  }, [menuId, buscaProdutoFiltrada, produtosBuscadosData, produtosPorGrupoData])

  const isLoadingProdutosVenda =
    !menuId ? false : buscaProdutoFiltrada.length >= 2 ? isLoadingBuscaProdutos : isLoadingProdutos

  return {
    produtosList,
    buscaProdutoFiltrada,
    isLoadingProdutosVenda,
    isLoadingBuscaProdutos,
    isLoadingProdutos,
    produtosError,
    produtosPorGrupoData,
    produtosBuscadosData,
    menuCatalogoIndisponivel: enabled && !menuId,
  }
}
