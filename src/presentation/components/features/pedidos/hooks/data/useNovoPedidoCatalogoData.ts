'use client'

import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import {
  aplicarPermissoesCadastroNoProdutoCatalogo,
  cacheProdutoCatalogoAtendePedido,
  obterProdutoDoCatalogo,
  type CarregarProdutoCatalogoOptions,
} from '@/src/domain/policies/pedido/CarrinhoCatalogoPolicy'
import { mesclarProdutosNoCatalogo } from '@/src/domain/policies/pedido/CatalogoVendaPolicy'
import { useProdutosCodigoPorId } from '@/src/presentation/hooks/produtos/useProdutosCodigoPorId'
import type { CanalVendaNovoPedido } from '../../novoPedidoProdutosApi'
import { fetchProdutoCatalogoPorId } from '../../novoPedidoProdutosApi'
import { useGruposVendaQuery } from './useGruposVendaQuery'
import { useProdutosVendaQuery } from './useProdutosVendaQuery'

export type UseNovoPedidoCatalogoDataParams = {
  estaNoPassoProdutos: boolean
  token: string | undefined
  menuId: string | null
  canal: CanalVendaNovoPedido
  grupoSelecionadoId: string | null
  setGrupoSelecionadoId: (id: string | null) => void
  buscaProdutoTexto: string
  catalogoProdutosPorId: Record<string, Produto>
  setCatalogoProdutosPorId: Dispatch<SetStateAction<Record<string, Produto>>>
}

export function useNovoPedidoCatalogoData({
  estaNoPassoProdutos,
  token,
  menuId,
  canal,
  grupoSelecionadoId,
  setGrupoSelecionadoId,
  buscaProdutoTexto,
  catalogoProdutosPorId,
  setCatalogoProdutosPorId,
}: UseNovoPedidoCatalogoDataParams) {
  const { permissoesPorId } = useProdutosCodigoPorId({ enabled: estaNoPassoProdutos })

  const aplicarPermissoesCadastro = useCallback(
    (produto: Produto) =>
      aplicarPermissoesCadastroNoProdutoCatalogo(produto, permissoesPorId.get(produto.getId())),
    [permissoesPorId]
  )

  const onProdutosGrupoCarregados = useCallback(
    (produtos: Produto[]) => {
      setCatalogoProdutosPorId(prev =>
        mesclarProdutosNoCatalogo(prev, produtos.map(aplicarPermissoesCadastro))
      )
    },
    [setCatalogoProdutosPorId, aplicarPermissoesCadastro]
  )

  const gruposQuery = useGruposVendaQuery({
    enabled: estaNoPassoProdutos,
    token,
    menuId,
    grupoSelecionadoId,
    setGrupoSelecionadoId,
  })

  const produtosQuery = useProdutosVendaQuery({
    enabled: estaNoPassoProdutos,
    token,
    menuId,
    grupoSelecionadoId,
    buscaProdutoTexto,
    onProdutosGrupoCarregados,
  })

  const produtosList = useMemo(
    () => produtosQuery.produtosList.map(aplicarPermissoesCadastro),
    [produtosQuery.produtosList, aplicarPermissoesCadastro]
  )

  useEffect(() => {
    if (permissoesPorId.size === 0) return
    setCatalogoProdutosPorId(prev => {
      let changed = false
      const next = { ...prev }
      for (const [id, produto] of Object.entries(prev)) {
        const applied = aplicarPermissoesCadastro(produto)
        if (applied !== produto) {
          next[id] = applied
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [permissoesPorId, aplicarPermissoesCadastro, setCatalogoProdutosPorId])

  const inflightProdutoPorIdRef = useRef<Map<string, Promise<Produto | null>>>(new Map())

  const carregarProdutoNoCatalogoSeNecessario = useCallback(
    async (
      produtoId: string,
      options?: CarregarProdutoCatalogoOptions
    ): Promise<Produto | null> => {
      if (!options?.forceRefresh) {
        const emCache = obterProdutoDoCatalogo(
          produtoId,
          catalogoProdutosPorId,
          produtosList
        )
        if (cacheProdutoCatalogoAtendePedido(emCache, options)) {
          setCatalogoProdutosPorId(prev =>
            prev[produtoId] ? prev : { ...prev, [emCache.getId()]: emCache }
          )
          return emCache
        }

        const inflight = inflightProdutoPorIdRef.current.get(produtoId)
        if (inflight) return inflight
      }

      if (!token) return null

      const fetchProduto = (async (): Promise<Produto | null> => {
        try {
          const entity = await fetchProdutoCatalogoPorId(produtoId, token, menuId)
          if (!entity) return null
          setCatalogoProdutosPorId(prev => ({ ...prev, [entity.getId()]: entity }))
          return entity
        } catch {
          return null
        }
      })()

      if (!options?.forceRefresh) {
        inflightProdutoPorIdRef.current.set(produtoId, fetchProduto)
      }

      try {
        return await fetchProduto
      } finally {
        inflightProdutoPorIdRef.current.delete(produtoId)
      }
    },
    [catalogoProdutosPorId, menuId, produtosList, token, setCatalogoProdutosPorId]
  )

  const menuCatalogoIndisponivel =
    estaNoPassoProdutos &&
    (gruposQuery.menuCatalogoIndisponivel || produtosQuery.menuCatalogoIndisponivel)

  return {
    grupos: gruposQuery.grupos,
    isLoadingGruposVenda: gruposQuery.isLoadingGruposVenda,
    produtosList,
    buscaProdutoFiltrada: produtosQuery.buscaProdutoFiltrada,
    isLoadingProdutosVenda: produtosQuery.isLoadingProdutosVenda,
    isLoadingBuscaProdutos: produtosQuery.isLoadingBuscaProdutos,
    isLoadingProdutos: produtosQuery.isLoadingProdutos,
    produtosError: produtosQuery.produtosError,
    hasNextProdutosCatalogo: produtosQuery.hasNextProdutosCatalogo,
    isFetchingNextProdutosCatalogo: produtosQuery.isFetchingNextProdutosCatalogo,
    carregarProximaPaginaProdutosCatalogo: produtosQuery.carregarProximaPaginaProdutosCatalogo,
    carregarProdutoNoCatalogoSeNecessario,
    canal,
    menuCatalogoIndisponivel,
  }
}
