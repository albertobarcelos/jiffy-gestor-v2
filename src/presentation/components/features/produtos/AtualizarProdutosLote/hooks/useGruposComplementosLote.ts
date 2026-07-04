'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import type { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { bulkUpdateProdutosLote } from '../utils/produtosLoteMutations'

export interface UseGruposComplementosLoteParams {
  produtos: Produto[]
  produtosSelecionados: Set<string>
  gruposComplementos: GrupoComplemento[]
  limparSelecaoProdutos: () => void
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'gruposComplementos') => void
  buscarProdutos: () => Promise<unknown>
}

export function useGruposComplementosLote({
  produtos,
  produtosSelecionados,
  gruposComplementos,
  limparSelecaoProdutos,
  marcarProdutosAlteradosNaSessao,
  buscarProdutos,
}: UseGruposComplementosLoteParams) {
  const tenantAuth = useAuthStore(s => s.tenantAuth)
  const [gruposComplementosSelecionados, setGruposComplementosSelecionados] = useState<Set<string>>(
    new Set()
  )
  const [modoGrupoComplemento, setModoGrupoComplemento] = useState<'adicionar' | 'remover'>(
    'adicionar'
  )
  const [isUpdating, setIsUpdating] = useState(false)

  const limparSelecaoGrupos = useCallback(() => {
    setGruposComplementosSelecionados(new Set())
  }, [])

  const toggleGrupoComplemento = useCallback((grupoId: string) => {
    setGruposComplementosSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(grupoId)) {
        novo.delete(grupoId)
      } else {
        novo.add(grupoId)
      }
      return novo
    })
  }, [])

  const todosGruposComplementosSelecionados =
    gruposComplementos.length > 0 &&
    gruposComplementosSelecionados.size === gruposComplementos.length

  const algunsGruposComplementosSelecionados =
    gruposComplementosSelecionados.size > 0 &&
    gruposComplementosSelecionados.size < gruposComplementos.length

  const handleToggleSelecionarTodosGrupos = useCallback(() => {
    if (todosGruposComplementosSelecionados) {
      setGruposComplementosSelecionados(new Set())
    } else {
      setGruposComplementosSelecionados(new Set(gruposComplementos.map((g) => g.getId())))
    }
  }, [gruposComplementos, todosGruposComplementosSelecionados])

  const vincularGruposComplementos = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (gruposComplementosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um grupo de complementos')
      return
    }

    const token = tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Vinculando grupos de complementos...')

    try {
      const gruposIdsArray = Array.from(gruposComplementosSelecionados)
      const payload = Array.from(produtosSelecionados).map((produtoId) => {
        const produto = produtos.find((p) => p.getId() === produtoId)
        const gruposExistentes = produto?.getGruposComplementos().map((g) => g.id) || []
        const gruposCombinados = [...new Set([...gruposExistentes, ...gruposIdsArray])]

        return {
          produtoId,
          gruposComplementosIds: gruposCombinados,
        }
      })

      await bulkUpdateProdutosLote(token, payload)

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'gruposComplementos')
      await buscarProdutos()
      showToast.success('Grupos de complementos vinculados com sucesso!')
      limparSelecaoGrupos()
      limparSelecaoProdutos()
    } catch (error: unknown) {
      console.error('Erro ao vincular grupos de complementos', error)
      const message =
        error instanceof Error ? error.message : 'Erro ao vincular grupos de complementos'
      showToast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [
    tenantAuth,
    buscarProdutos,
    gruposComplementosSelecionados,
    limparSelecaoGrupos,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    produtos,
    produtosSelecionados,
  ])

  const desvincularGruposComplementos = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (gruposComplementosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um grupo de complementos')
      return
    }

    const token = tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsUpdating(true)
    showToast.loading('Desvinculando grupos de complementos...')

    try {
      const gruposIdsArray = Array.from(gruposComplementosSelecionados)
      const payload = Array.from(produtosSelecionados).map((produtoId) => ({
        produtoId,
        gruposComplementosIdsToRemove: gruposIdsArray,
      }))

      await bulkUpdateProdutosLote(token, payload)

      marcarProdutosAlteradosNaSessao(Array.from(produtosSelecionados), 'gruposComplementos')
      await buscarProdutos()
      showToast.success('Grupos de complementos desvinculados com sucesso!')
      limparSelecaoGrupos()
      limparSelecaoProdutos()
    } catch (error: unknown) {
      console.error('Erro ao desvincular grupos de complementos', error)
      const message =
        error instanceof Error ? error.message : 'Erro ao desvincular grupos de complementos'
      showToast.error(message)
    } finally {
      setIsUpdating(false)
    }
  }, [
    tenantAuth,
    buscarProdutos,
    gruposComplementosSelecionados,
    limparSelecaoGrupos,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    produtosSelecionados,
  ])

  const atualizarGruposComplementos = useCallback(() => {
    if (modoGrupoComplemento === 'adicionar') {
      void vincularGruposComplementos()
    } else {
      void desvincularGruposComplementos()
    }
  }, [desvincularGruposComplementos, modoGrupoComplemento, vincularGruposComplementos])

  const resetAoEntrarNaAba = useCallback(() => {
    setModoGrupoComplemento('adicionar')
    limparSelecaoGrupos()
  }, [limparSelecaoGrupos])

  return useMemo(
    () => ({
      gruposComplementosSelecionados,
      setGruposComplementosSelecionados,
      modoGrupoComplemento,
      setModoGrupoComplemento,
      isUpdating,
      toggleGrupoComplemento,
      todosGruposComplementosSelecionados,
      algunsGruposComplementosSelecionados,
      handleToggleSelecionarTodosGrupos,
      atualizarGruposComplementos,
      limparSelecaoGrupos,
      resetAoEntrarNaAba,
    }),
    [
      algunsGruposComplementosSelecionados,
      atualizarGruposComplementos,
      gruposComplementosSelecionados,
      handleToggleSelecionarTodosGrupos,
      isUpdating,
      limparSelecaoGrupos,
      modoGrupoComplemento,
      resetAoEntrarNaAba,
      toggleGrupoComplemento,
      todosGruposComplementosSelecionados,
    ]
  )
}
