'use client'

import { useEffect, useMemo } from 'react'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { menuGrupoProdutoToGrupoProduto } from '@/src/application/mappers/MenuProdutoCatalogMapper'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchAllMenuGruposProdutos } from '@/src/infrastructure/api/repositories/menuCatalogFetch'
import { fetchGrupoIdsComProdutosAtivosMenu } from '../../novoPedidoProdutosApi'

export type UseGruposVendaQueryParams = {
  enabled: boolean
  token: string | undefined
  menuId: string | null
  grupoSelecionadoId: string | null
  onGrupoSelecionadoInvalido: () => void
}

export function useGruposVendaQuery({
  enabled,
  token,
  menuId,
  grupoSelecionadoId,
  onGrupoSelecionadoInvalido,
}: UseGruposVendaQueryParams) {
  const {
    data: gruposMenu = [],
    isLoading: isLoadingGruposMenu,
  } = useSecureTenantQuery(
    ['novo-pedido-menu-grupos', menuId],
    async ({ token: tenantToken }) => {
      if (!menuId) return [] as GrupoProduto[]
      const items = await fetchAllMenuGruposProdutos(menuId, tenantToken)
      return items.map(menuGrupoProdutoToGrupoProduto)
    },
    {
      enabled: enabled && !!token && !!menuId,
      staleTime: 1000 * 60 * 5,
    }
  )

  const {
    data: grupoIdsComProdutosAtivos,
    isLoading: isLoadingGruposComProdutos,
    isError: erroGruposComProdutos,
  } = useSecureTenantQuery(
    ['novo-pedido-grupos-com-produtos', menuId],
    async ({ token: tenantToken }) => fetchGrupoIdsComProdutosAtivosMenu(tenantToken, menuId),
    {
      enabled: enabled && !!token && !!menuId,
      staleTime: 1000 * 60 * 5,
    }
  )

  const grupos = useMemo(() => {
    if (!menuId) return []

    const elegiveis = gruposMenu.filter(grupo => grupo.isAtivo())

    if (!grupoIdsComProdutosAtivos) {
      if (isLoadingGruposComProdutos) return []
      if (erroGruposComProdutos) return elegiveis
      return []
    }

    return elegiveis
      .filter(grupo => grupoIdsComProdutosAtivos.has(grupo.getId()))
      .sort((a, b) => {
        const ordemA = a.getOrdem()
        const ordemB = b.getOrdem()
        if (ordemA !== undefined && ordemB !== undefined) return ordemA - ordemB
        if (ordemA !== undefined && ordemB === undefined) return -1
        if (ordemA === undefined && ordemB !== undefined) return 1
        return a.getNome().localeCompare(b.getNome(), 'pt-BR')
      })
  }, [
    menuId,
    gruposMenu,
    grupoIdsComProdutosAtivos,
    isLoadingGruposComProdutos,
    erroGruposComProdutos,
  ])

  useEffect(() => {
    if (!grupoSelecionadoId || !grupoIdsComProdutosAtivos) return
    if (!grupoIdsComProdutosAtivos.has(grupoSelecionadoId)) {
      onGrupoSelecionadoInvalido()
    }
  }, [grupoSelecionadoId, grupoIdsComProdutosAtivos, onGrupoSelecionadoInvalido])

  const isLoadingGruposVenda =
    !menuId ? false : isLoadingGruposMenu || isLoadingGruposComProdutos

  return {
    grupos,
    isLoadingGruposVenda,
    grupoIdsComProdutosAtivos,
    menuCatalogoIndisponivel: enabled && !menuId,
  }
}
