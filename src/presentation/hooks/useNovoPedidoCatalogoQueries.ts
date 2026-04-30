'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { Produto } from '@/src/domain/entities/Produto'

export interface UseNovoPedidoCatalogoQueriesParams {
  open: boolean
  modoVisualizacao: boolean | undefined
  currentStep: number
  grupoSelecionadoId: string | null
  vendaId: string | undefined
  /** Bearer token atual (`auth?.getAccessToken()`). */
  token: string | null | undefined
}

/**
 * Grupos, produtos por grupo e meios de pagamento usados no fluxo do novo pedido.
 */
export function useNovoPedidoCatalogoQueries({
  open,
  modoVisualizacao,
  currentStep,
  grupoSelecionadoId,
  vendaId,
  token,
}: UseNovoPedidoCatalogoQueriesParams) {
  const { data: gruposData, isLoading: isLoadingGrupos } = useGruposProdutos({
    ativo: true,
    limit: 100,
    enabled: open && !modoVisualizacao && currentStep >= 2,
    refetchOnWindowFocus: false,
  })

  const {
    data: produtosPorGrupoData,
    isLoading: isLoadingProdutos,
    error: produtosError,
  } = useQuery({
    queryKey: ['produtos-por-grupo', grupoSelecionadoId],
    queryFn: async () => {
      if (!grupoSelecionadoId || !token) {
        return { produtos: [], count: 0 }
      }
      const response = await fetch(
        `/api/grupos-produtos/${grupoSelecionadoId}/produtos?limit=100&offset=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        }
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Erro ao carregar produtos do grupo')
      }
      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      const produtos = items.map((item: Record<string, unknown>) => Produto.fromJSON(item))
      return {
        produtos,
        count: data.count || produtos.length,
      }
    },
    enabled: open && !!grupoSelecionadoId && !!token,
    staleTime: 0,
    gcTime: 1000 * 60 * 1,
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const {
    data: meiosPagamentoData,
    isPending: isPendingMeiosPagamento,
    isFetching: isFetchingMeiosPagamento,
  } = useMeiosPagamentoInfinite({
    limit: 100,
    ativo: true,
    enabled: open && (currentStep >= 3 || !!modoVisualizacao || !!vendaId),
    refetchOnWindowFocus: false,
  })

  const grupos = useMemo(() => {
    if (!gruposData) return []
    return [...gruposData].sort((a, b) => {
      const ordemA = a.getOrdem()
      const ordemB = b.getOrdem()
      if (ordemA !== undefined && ordemB !== undefined) {
        return ordemA - ordemB
      }
      if (ordemA !== undefined && ordemB === undefined) {
        return -1
      }
      if (ordemA === undefined && ordemB !== undefined) {
        return 1
      }
      return a.getNome().localeCompare(b.getNome())
    })
  }, [gruposData])

  const produtosList = useMemo(() => {
    if (!produtosPorGrupoData?.produtos) return []
    return [...produtosPorGrupoData.produtos]
      .filter(p => p.isAtivo())
      .sort((a, b) => a.getNome().localeCompare(b.getNome()))
  }, [produtosPorGrupoData])

  const meiosPagamento = useMemo(() => {
    if (!meiosPagamentoData?.pages) return []
    return meiosPagamentoData.pages.flatMap(page => page.meiosPagamento || [])
  }, [meiosPagamentoData])

  const mostrarLoadingFormasPagamento =
    isPendingMeiosPagamento || (isFetchingMeiosPagamento && meiosPagamentoData === undefined)

  return {
    grupos,
    isLoadingGrupos,
    produtosList,
    isLoadingProdutos,
    produtosError,
    meiosPagamento,
    mostrarLoadingFormasPagamento,
  }
}
