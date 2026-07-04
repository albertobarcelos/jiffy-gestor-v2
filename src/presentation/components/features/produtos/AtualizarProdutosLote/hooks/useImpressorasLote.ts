'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import type { Impressora } from '@/src/domain/entities/Impressora'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { bulkUpdateProdutosLote } from '../utils/produtosLoteMutations'

export interface UseImpressorasLoteParams {
  produtos: Produto[]
  produtosSelecionados: Set<string>
  impressorasDisponiveis: Impressora[]
  limparSelecaoProdutos: () => void
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'impressoras') => void
  buscarProdutos: () => Promise<unknown>
}

export function useImpressorasLote({
  produtos,
  produtosSelecionados,
  impressorasDisponiveis,
  limparSelecaoProdutos,
  marcarProdutosAlteradosNaSessao,
  buscarProdutos,
}: UseImpressorasLoteParams) {
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const [impressorasSelecionadas, setImpressorasSelecionadas] = useState<Set<string>>(new Set())
  const [modoImpressora, setModoImpressora] = useState<'adicionar' | 'remover'>('adicionar')
  const [isUpdating, setIsUpdating] = useState(false)

  const limparSelecaoImpressoras = useCallback(() => {
    setImpressorasSelecionadas(new Set())
  }, [])

  const toggleImpressora = useCallback((impressoraId: string) => {
    setImpressorasSelecionadas((prev) => {
      const novo = new Set(prev)
      if (novo.has(impressoraId)) {
        novo.delete(impressoraId)
      } else {
        novo.add(impressoraId)
      }
      return novo
    })
  }, [])

  const todasImpressorasSelecionadas =
    impressorasDisponiveis.length > 0 &&
    impressorasSelecionadas.size === impressorasDisponiveis.length

  const algumasImpressorasSelecionadas =
    impressorasSelecionadas.size > 0 &&
    impressorasSelecionadas.size < impressorasDisponiveis.length

  const handleToggleSelecionarTodasImpressoras = useCallback(() => {
    if (todasImpressorasSelecionadas) {
      setImpressorasSelecionadas(new Set())
    } else {
      setImpressorasSelecionadas(new Set(impressorasDisponiveis.map((i) => i.getId())))
    }
  }, [impressorasDisponiveis, todasImpressorasSelecionadas])

  const adicionarImpressoras = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (impressorasSelecionadas.size === 0) {
      showToast.error('Selecione pelo menos uma impressora')
      return
    }

    const token = tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Vinculando impressoras...')

    try {
      const impressorasIdsArray = Array.from(impressorasSelecionadas)
      const payload = Array.from(produtosSelecionados).map((produtoId) => {
        const produto = produtos.find((p) => p.getId() === produtoId)
        const impressorasExistentes = produto?.getImpressoras().map((i) => i.id) || []
        const impressorasCombinadas = [...new Set([...impressorasExistentes, ...impressorasIdsArray])]

        return {
          produtoId,
          impressorasIds: impressorasCombinadas,
        }
      })

      await bulkUpdateProdutosLote(token, payload)

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'impressoras')
      await buscarProdutos()
      showToast.success('Impressoras vinculadas com sucesso!')
      limparSelecaoImpressoras()
      limparSelecaoProdutos()
    } catch (error: unknown) {
      console.error('Erro ao vincular impressoras', error)
      const message = error instanceof Error ? error.message : 'Erro ao vincular impressoras'
      showToast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [
    tenantAuth,
    buscarProdutos,
    impressorasSelecionadas,
    limparSelecaoImpressoras,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    produtos,
    produtosSelecionados,
  ])

  const removerImpressoras = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (impressorasSelecionadas.size === 0) {
      showToast.error('Selecione pelo menos uma impressora')
      return
    }

    const token = tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Desvinculando impressoras...')

    try {
      const impressorasIdsArray = Array.from(impressorasSelecionadas)
      const payload = Array.from(produtosSelecionados).map((produtoId) => ({
        produtoId,
        impressorasIdsToRemove: impressorasIdsArray,
      }))

      await bulkUpdateProdutosLote(token, payload)

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'impressoras')
      await buscarProdutos()
      showToast.success('Impressoras desvinculadas com sucesso!')
      limparSelecaoImpressoras()
      limparSelecaoProdutos()
    } catch (error: unknown) {
      console.error('Erro ao desvincular impressoras', error)
      const message = error instanceof Error ? error.message : 'Erro ao desvincular impressoras'
      showToast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [
    tenantAuth,
    buscarProdutos,
    impressorasSelecionadas,
    limparSelecaoImpressoras,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    produtosSelecionados,
  ])

  const atualizarImpressoras = useCallback(() => {
    if (modoImpressora === 'adicionar') {
      void adicionarImpressoras()
    } else {
      void removerImpressoras()
    }
  }, [adicionarImpressoras, modoImpressora, removerImpressoras])

  const resetAoEntrarNaAba = useCallback(() => {
    setModoImpressora('adicionar')
    limparSelecaoImpressoras()
  }, [limparSelecaoImpressoras])

  return useMemo(
    () => ({
      impressorasSelecionadas,
      setImpressorasSelecionadas,
      modoImpressora,
      setModoImpressora,
      isUpdating,
      toggleImpressora,
      todasImpressorasSelecionadas,
      algumasImpressorasSelecionadas,
      handleToggleSelecionarTodasImpressoras,
      atualizarImpressoras,
      limparSelecaoImpressoras,
      resetAoEntrarNaAba,
    }),
    [
      algumasImpressorasSelecionadas,
      atualizarImpressoras,
      handleToggleSelecionarTodasImpressoras,
      impressorasSelecionadas,
      isUpdating,
      limparSelecaoImpressoras,
      modoImpressora,
      resetAoEntrarNaAba,
      toggleImpressora,
      todasImpressorasSelecionadas,
    ]
  )
}
