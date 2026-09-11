'use client'

import { useEffect, useMemo } from 'react'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import {
  montarGruposCatalogoVenda,
  resolverGrupoCatalogoSelecionadoId,
} from '@/src/domain/policies/pedido/CatalogoVendaPolicy'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGruposCatalogoVenda } from '../../novoPedidoProdutosApi'

export type UseGruposVendaQueryParams = {
  enabled: boolean
  token: string | undefined
  menuId: string | null
  grupoSelecionadoId: string | null
  setGrupoSelecionadoId: (id: string | null) => void
}

export function useGruposVendaQuery({
  enabled,
  token,
  menuId,
  grupoSelecionadoId,
  setGrupoSelecionadoId,
}: UseGruposVendaQueryParams) {
  const {
    data: gruposMenu = [],
    isLoading: isLoadingGruposMenu,
  } = useSecureTenantQuery(
    ['novo-pedido-menu-grupos', menuId],
    async ({ token: tenantToken }) => {
      if (!menuId) return [] as GrupoProduto[]
      return fetchGruposCatalogoVenda(menuId, tenantToken)
    },
    {
      enabled: enabled && !!token && !!menuId,
      staleTime: 1000 * 60 * 5,
    }
  )

  const grupos = useMemo(
    () =>
      montarGruposCatalogoVenda({
        menuId,
        gruposMenu,
      }),
    [menuId, gruposMenu]
  )

  useEffect(() => {
    const proximoId = resolverGrupoCatalogoSelecionadoId(grupos, grupoSelecionadoId)
    if (proximoId === grupoSelecionadoId) return
    setGrupoSelecionadoId(proximoId)
  }, [grupos, grupoSelecionadoId, setGrupoSelecionadoId])

  return {
    grupos,
    isLoadingGruposVenda: !menuId ? false : isLoadingGruposMenu,
    menuCatalogoIndisponivel: enabled && !menuId,
  }
}
