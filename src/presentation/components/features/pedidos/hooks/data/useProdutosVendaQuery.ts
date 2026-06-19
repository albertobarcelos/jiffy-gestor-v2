'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Produto } from '@/src/domain/entities/Produto'
import type { Produto as ProdutoEntity } from '@/src/domain/entities/Produto'
import { fetchProdutosDoGrupo, fetchProdutosPorNomeBusca } from '../../novoPedidoProdutosApi'

export type UseProdutosVendaQueryParams = {
  enabled: boolean
  token: string | undefined
  empresaId: string | undefined
  grupoSelecionadoId: string | null
  buscaProdutoTexto: string
  onProdutosGrupoCarregados: (produtos: ProdutoEntity[]) => void
}

export function useProdutosVendaQuery({
  enabled,
  token,
  empresaId,
  grupoSelecionadoId,
  buscaProdutoTexto,
  onProdutosGrupoCarregados,
}: UseProdutosVendaQueryParams) {
  const buscaProdutoFiltrada = buscaProdutoTexto.trim().toLowerCase()

  const { data: produtosBuscadosData, isLoading: isLoadingBuscaProdutos } = useQuery({
    queryKey: ['produtos-busca', buscaProdutoFiltrada],
    queryFn: async () => {
      if (!token) throw new Error('Token não encontrado')
      const produtos = await fetchProdutosPorNomeBusca(buscaProdutoFiltrada, token)
      return { produtos }
    },
    enabled: !!token && enabled && buscaProdutoFiltrada.length >= 2,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const {
    data: produtosPorGrupoData,
    isLoading: isLoadingProdutos,
    error: produtosError,
  } = useQuery({
    queryKey: ['produtos-por-grupo', grupoSelecionadoId, empresaId],
    queryFn: async () => {
      if (!grupoSelecionadoId || !token) {
        return { produtos: [], count: 0 }
      }
      return fetchProdutosDoGrupo(grupoSelecionadoId, token)
    },
    enabled: enabled && !!grupoSelecionadoId && !!token,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (!produtosPorGrupoData?.produtos?.length) return
    onProdutosGrupoCarregados(produtosPorGrupoData.produtos)
  }, [produtosPorGrupoData, onProdutosGrupoCarregados])

  const produtosList = useMemo(() => {
    if (buscaProdutoFiltrada.length >= 2) {
      if (!produtosBuscadosData?.produtos) return []
      return [...produtosBuscadosData.produtos]
        .filter(p => p.isAtivo())
        .sort((a, b) => a.getNome().localeCompare(b.getNome()))
    }

    if (!produtosPorGrupoData?.produtos) return []
    return [...produtosPorGrupoData.produtos]
      .filter(p => p.isAtivo())
      .sort((a, b) => a.getNome().localeCompare(b.getNome()))
  }, [buscaProdutoFiltrada, produtosBuscadosData, produtosPorGrupoData])

  const isLoadingProdutosVenda =
    buscaProdutoFiltrada.length >= 2 ? isLoadingBuscaProdutos : isLoadingProdutos

  return {
    produtosList,
    buscaProdutoFiltrada,
    isLoadingProdutosVenda,
    isLoadingBuscaProdutos,
    isLoadingProdutos,
    produtosError,
    produtosPorGrupoData,
    produtosBuscadosData,
  }
}
