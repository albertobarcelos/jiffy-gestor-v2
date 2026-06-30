'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import { FILTRO_COLUNA_TODOS } from '../constants'
import type { FiltroColunaVazia, TabPainelLote } from '../types'
import { produtoSemDadoNaColuna } from '../rules/produtosLoteFiltros'

const PRODUTOS_ALTERADOS_INICIAL: Record<TabPainelLote, Set<string>> = {
  precos: new Set(),
  impressoras: new Set(),
  gruposComplementos: new Set(),
  permissoes: new Set(),
  fiscal: new Set(),
}

export interface UseSelecaoProdutosLoteParams {
  produtos: Produto[]
  activeTab: TabPainelLote
  filtroColunaVazia: FiltroColunaVazia
}

export function useSelecaoProdutosLote({
  produtos,
  activeTab,
  filtroColunaVazia,
}: UseSelecaoProdutosLoteParams) {
  const [produtosSelecionados, setProdutosSelecionados] = useState<Set<string>>(new Set())
  const [produtosExpandidos, setProdutosExpandidos] = useState<Set<string>>(new Set())
  const [produtosAlteradosPorAba, setProdutosAlteradosPorAba] = useState<
    Record<TabPainelLote, Set<string>>
  >(() => ({
    precos: new Set(),
    impressoras: new Set(),
    gruposComplementos: new Set(),
    permissoes: new Set(),
    fiscal: new Set(),
  }))

  useEffect(() => {
    setProdutosExpandidos(new Set())
  }, [activeTab])

  const marcarProdutosAlteradosNaSessao = useCallback((ids: string[], aba: TabPainelLote) => {
    if (ids.length === 0) return
    setProdutosAlteradosPorAba((prev) => {
      const novoSet = new Set(prev[aba])
      for (const id of ids) novoSet.add(id)
      return { ...prev, [aba]: novoSet }
    })
  }, [])

  const toggleSelecao = useCallback((produtoId: string) => {
    setProdutosSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(produtoId)) {
        novo.delete(produtoId)
      } else {
        novo.add(produtoId)
      }
      return novo
    })
  }, [])

  const toggleExpansao = useCallback((produtoId: string) => {
    setProdutosExpandidos((prev) => {
      const novo = new Set(prev)
      if (novo.has(produtoId)) {
        novo.delete(produtoId)
      } else {
        novo.add(produtoId)
      }
      return novo
    })
  }, [])

  const limparSelecaoProdutos = useCallback(() => {
    setProdutosSelecionados(new Set())
  }, [])

  const produtosExibicao = useMemo(() => {
    if (filtroColunaVazia === FILTRO_COLUNA_TODOS) return produtos
    return produtos.filter((p) => produtoSemDadoNaColuna(p, filtroColunaVazia))
  }, [produtos, filtroColunaVazia])

  const todosSelecionados =
    produtosExibicao.length > 0 &&
    produtosExibicao.every((p) => produtosSelecionados.has(p.getId()))

  const algunsSelecionadosLista =
    produtosExibicao.some((p) => produtosSelecionados.has(p.getId())) && !todosSelecionados

  const handleToggleSelecionarTodos = useCallback(
    (checked: boolean) => {
      if (checked) {
        setProdutosSelecionados(new Set(produtosExibicao.map((p) => p.getId())))
      } else {
        setProdutosSelecionados(new Set())
      }
    },
    [produtosExibicao]
  )

  return {
    produtosSelecionados,
    setProdutosSelecionados,
    produtosExpandidos,
    produtosAlteradosPorAba,
    produtosExibicao,
    todosSelecionados,
    algunsSelecionadosLista,
    toggleSelecao,
    toggleExpansao,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    handleToggleSelecionarTodos,
  }
}

/** Estado inicial vazio de produtos alterados por aba (útil em testes). */
export { PRODUTOS_ALTERADOS_INICIAL }
