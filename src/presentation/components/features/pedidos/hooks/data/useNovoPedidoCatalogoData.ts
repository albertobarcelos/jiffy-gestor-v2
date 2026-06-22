'use client'

import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import type { CanalVendaNovoPedido } from '../../novoPedidoProdutosApi'
import { useGruposVendaQuery } from './useGruposVendaQuery'
import { useProdutosVendaQuery } from './useProdutosVendaQuery'

export type UseNovoPedidoCatalogoDataParams = {
  estaNoPassoProdutos: boolean
  token: string | undefined
  empresaId: string | undefined
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
  empresaId,
  canal,
  grupoSelecionadoId,
  setGrupoSelecionadoId,
  buscaProdutoTexto,
  catalogoProdutosPorId,
  setCatalogoProdutosPorId,
}: UseNovoPedidoCatalogoDataParams) {
  const onGrupoSelecionadoInvalido = useCallback(() => {
    setGrupoSelecionadoId(null)
  }, [setGrupoSelecionadoId])

  const onProdutosGrupoCarregados = useCallback(
    (produtos: Produto[]) => {
      setCatalogoProdutosPorId(prev => {
        const next = { ...prev }
        for (const produto of produtos) {
          next[produto.getId()] = produto
        }
        return next
      })
    },
    [setCatalogoProdutosPorId]
  )

  const gruposQuery = useGruposVendaQuery({
    enabled: estaNoPassoProdutos,
    token,
    empresaId,
    canal,
    grupoSelecionadoId,
    onGrupoSelecionadoInvalido,
  })

  const produtosQuery = useProdutosVendaQuery({
    enabled: estaNoPassoProdutos,
    token,
    empresaId,
    grupoSelecionadoId,
    buscaProdutoTexto,
    onProdutosGrupoCarregados,
  })

  const inflightProdutoPorIdRef = useRef<Map<string, Promise<Produto | null>>>(new Map())

  const carregarProdutoNoCatalogoSeNecessario = useCallback(
    async (
      produtoId: string,
      options?: { forceRefresh?: boolean }
    ): Promise<Produto | null> => {
      if (!options?.forceRefresh) {
        const emCache =
          catalogoProdutosPorId[produtoId] ??
          produtosQuery.produtosList.find(p => p.getId() === produtoId)
        if (emCache) {
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
          const { fetchProdutoCatalogoPorId } = await import('../../novoPedidoProdutosApi')
          const entity = await fetchProdutoCatalogoPorId(produtoId, token)
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
    [catalogoProdutosPorId, produtosQuery.produtosList, token, setCatalogoProdutosPorId]
  )

  return {
    grupos: gruposQuery.grupos,
    isLoadingGruposVenda: gruposQuery.isLoadingGruposVenda,
    produtosList: produtosQuery.produtosList,
    buscaProdutoFiltrada: produtosQuery.buscaProdutoFiltrada,
    isLoadingProdutosVenda: produtosQuery.isLoadingProdutosVenda,
    isLoadingBuscaProdutos: produtosQuery.isLoadingBuscaProdutos,
    isLoadingProdutos: produtosQuery.isLoadingProdutos,
    produtosError: produtosQuery.produtosError,
    carregarProdutoNoCatalogoSeNecessario,
    canal,
  }
}
