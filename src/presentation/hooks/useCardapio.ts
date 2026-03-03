'use client'

import { useQuery } from '@tanstack/react-query'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { Produto } from '@/src/domain/entities/Produto'

/**
 * Hook para buscar grupos de produtos do cardápio
 * Por enquanto usa dados mockados
 * Quando backend estiver pronto, usar endpoint público
 */
export function useCardapioGrupos() {
  return useQuery<GrupoProduto[]>({
    queryKey: ['cardapio', 'grupos'],
    queryFn: async () => {
      // TODO: Quando backend estiver pronto, usar endpoint público:
      // const response = await fetch('/api/cardapio-publico/grupos?ativoLocal=true&limit=100')
      
      // Por enquanto, retornar array vazio
      // Os dados serão carregados quando a página de grupos for acessada
      // e usar os hooks existentes que requerem autenticação
      return []
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar produtos do cardápio
 */
export function useCardapioProdutos(grupoId?: string) {
  return useQuery<{ produtos: Produto[]; count: number }>({
    queryKey: ['cardapio', 'produtos', grupoId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('ativo', 'true')
      params.append('ativoLocal', 'true')
      params.append('limit', '100')
      if (grupoId) {
        params.append('grupoProdutoId', grupoId)
      }

      const response = await fetch(`/api/produtos?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos')
      }

      const data = await response.json()
      const produtos = (data.items || []).map((item: any) => Produto.fromJSON(item))

      // Ordenar por nome
      produtos.sort((a: Produto, b: Produto) => a.getNome().localeCompare(b.getNome()))

      return {
        produtos,
        count: data.count || produtos.length,
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

/**
 * Hook para buscar produtos por grupo (endpoint específico)
 */
export function useCardapioProdutosPorGrupo(grupoId: string) {
  return useQuery<{ produtos: Produto[]; count: number }>({
    queryKey: ['cardapio', 'produtos-por-grupo', grupoId],
    queryFn: async () => {
      if (!grupoId) {
        return { produtos: [], count: 0 }
      }

      const response = await fetch(`/api/grupos-produtos/${grupoId}/produtos?limit=100&offset=0`, {
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar produtos do grupo')
      }

      const data = await response.json()
      const items = Array.isArray(data.items) ? data.items : []
      const produtos = items.map((item: any) => Produto.fromJSON(item))

      // Filtrar apenas produtos ativos para local
      const produtosAtivos = produtos.filter((p: Produto) => p.isAtivoLocal?.() ?? false)

      // Ordenar por nome
      produtosAtivos.sort((a: Produto, b: Produto) => a.getNome().localeCompare(b.getNome()))

      return {
        produtos: produtosAtivos,
        count: produtosAtivos.length,
      }
    },
    enabled: !!grupoId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}
