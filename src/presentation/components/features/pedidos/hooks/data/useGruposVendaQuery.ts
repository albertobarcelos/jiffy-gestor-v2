'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import {
  fetchGrupoIdsComProdutosAtivosVenda,
  type CanalVendaNovoPedido,
} from '../../novoPedidoProdutosApi'

export type UseGruposVendaQueryParams = {
  enabled: boolean
  token: string | undefined
  empresaId: string | undefined
  canal: CanalVendaNovoPedido
  grupoSelecionadoId: string | null
  onGrupoSelecionadoInvalido: () => void
}

export function useGruposVendaQuery({
  enabled,
  token,
  empresaId,
  canal,
  grupoSelecionadoId,
  onGrupoSelecionadoInvalido,
}: UseGruposVendaQueryParams) {
  const { data: gruposData, isLoading: isLoadingGrupos } = useGruposProdutos({
    ativo: true,
    limit: 1000,
    enabled,
    refetchOnWindowFocus: false,
  })

  const {
    data: grupoIdsComProdutosAtivos,
    isLoading: isLoadingGruposComProdutos,
    isError: erroGruposComProdutos,
  } = useQuery({
    queryKey: ['novo-pedido-grupos-com-produtos', empresaId, canal],
    queryFn: async () => {
      if (!token) throw new Error('Token não encontrado')
      return fetchGrupoIdsComProdutosAtivosVenda(token, canal)
    },
    enabled: enabled && !!token,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  })

  const gruposOrdenados = useMemo(() => {
    if (!gruposData) return []
    return [...gruposData].sort((a, b) => {
      const ordemA = a.getOrdem()
      const ordemB = b.getOrdem()
      if (ordemA !== undefined && ordemB !== undefined) return ordemA - ordemB
      if (ordemA !== undefined && ordemB === undefined) return -1
      if (ordemA === undefined && ordemB !== undefined) return 1
      return a.getNome().localeCompare(b.getNome())
    })
  }, [gruposData])

  const grupos = useMemo(() => {
    const elegivelNoCanal = gruposOrdenados.filter((grupo: GrupoProduto) => {
      if (!grupo.isAtivo()) return false
      if (canal === 'entrega' && !grupo.isAtivoDelivery()) return false
      if (canal === 'balcao' && !grupo.isAtivoLocal()) return false
      return true
    })

    if (!grupoIdsComProdutosAtivos) {
      if (isLoadingGruposComProdutos) return []
      if (erroGruposComProdutos) return elegivelNoCanal
      return []
    }

    return elegivelNoCanal.filter(grupo => grupoIdsComProdutosAtivos.has(grupo.getId()))
  }, [
    gruposOrdenados,
    grupoIdsComProdutosAtivos,
    canal,
    isLoadingGruposComProdutos,
    erroGruposComProdutos,
  ])

  useEffect(() => {
    if (!grupoSelecionadoId || !grupoIdsComProdutosAtivos) return
    if (!grupoIdsComProdutosAtivos.has(grupoSelecionadoId)) {
      onGrupoSelecionadoInvalido()
    }
  }, [grupoSelecionadoId, grupoIdsComProdutosAtivos, onGrupoSelecionadoInvalido])

  const isLoadingGruposVenda = isLoadingGrupos || isLoadingGruposComProdutos

  return {
    grupos,
    isLoadingGruposVenda,
    grupoIdsComProdutosAtivos,
  }
}
