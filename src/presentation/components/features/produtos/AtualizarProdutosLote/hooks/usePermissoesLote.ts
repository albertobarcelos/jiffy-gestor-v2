'use client'

import { useCallback, useMemo, useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { CAMPOS_PERMISSAO_PDV } from '../constants'
import { montarBodyPermissoesParcial } from '../rules/permissoesLote.rules'
import type { PermissaoCampoChave } from '../types'
import { bulkUpdateProdutosLote } from '../utils/produtosLoteMutations'

export interface UsePermissoesLoteParams {
  produtosSelecionados: Set<string>
  limparSelecaoProdutos: () => void
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'permissoes') => void
  buscarProdutos: () => Promise<unknown>
}

export function usePermissoesLote({
  produtosSelecionados,
  limparSelecaoProdutos,
  marcarProdutosAlteradosNaSessao,
  buscarProdutos,
}: UsePermissoesLoteParams) {
  const { auth } = useAuthStore()
  const [modoPermissao, setModoPermissao] = useState<'ativar' | 'desativar'>('ativar')
  const [permissoesCamposSelecionados, setPermissoesCamposSelecionados] = useState<
    Set<PermissaoCampoChave>
  >(new Set())
  const [isSalvandoPermissoes, setIsSalvandoPermissoes] = useState(false)

  const limparSelecaoPermissoes = useCallback(() => {
    setPermissoesCamposSelecionados(new Set())
  }, [])

  const togglePermissaoCampo = useCallback((chave: PermissaoCampoChave) => {
    setPermissoesCamposSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(chave)) {
        novo.delete(chave)
      } else {
        novo.add(chave)
      }
      return novo
    })
  }, [])

  const todasPermissoesSelecionadas =
    CAMPOS_PERMISSAO_PDV.length > 0 &&
    permissoesCamposSelecionados.size === CAMPOS_PERMISSAO_PDV.length

  const handleToggleSelecionarTodasPermissoes = useCallback(() => {
    if (todasPermissoesSelecionadas) {
      setPermissoesCamposSelecionados(new Set())
    } else {
      setPermissoesCamposSelecionados(
        new Set(CAMPOS_PERMISSAO_PDV.map((c) => c.chave))
      )
    }
  }, [todasPermissoesSelecionadas])

  const resetAoEntrarNaAba = useCallback(() => {
    setModoPermissao('ativar')
    limparSelecaoPermissoes()
  }, [limparSelecaoPermissoes])

  /** POST bulk-update com campos parciais de permissões PDV (1 request). */
  const vincularPermissoesEmLote = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }
    if (permissoesCamposSelecionados.size === 0) {
      showToast.error('Selecione ao menos uma permissão')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const ids = Array.from(produtosSelecionados)
    const valorAlvo = modoPermissao === 'ativar'
    const permissoesParciais = montarBodyPermissoesParcial(
      permissoesCamposSelecionados,
      valorAlvo
    )
    const payload = ids.map((produtoId) => ({
      produtoId,
      ...permissoesParciais,
    }))

    setIsSalvandoPermissoes(true)
    showToast.loading('Salvando permissões...')

    try {
      await bulkUpdateProdutosLote(token, payload)

      marcarProdutosAlteradosNaSessao(ids, 'permissoes')
      await buscarProdutos()
      limparSelecaoProdutos()

      const acao = modoPermissao === 'ativar' ? 'ativadas' : 'desativadas'
      showToast.success(`Permissões ${acao} com sucesso! (${ids.length} produto(s))`)
    } catch (error: unknown) {
      console.error('Erro ao vincular permissões em lote', error)
      const message = error instanceof Error ? error.message : 'Erro ao vincular permissões'
      showToast.error(message)
    } finally {
      setIsSalvandoPermissoes(false)
    }
  }, [
    auth,
    buscarProdutos,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    modoPermissao,
    permissoesCamposSelecionados,
    produtosSelecionados,
  ])

  return useMemo(
    () => ({
      modoPermissao,
      setModoPermissao,
      permissoesCamposSelecionados,
      setPermissoesCamposSelecionados,
      isSalvandoPermissoes,
      salvandoPermissoesProgresso: null as { atual: number; total: number } | null,
      togglePermissaoCampo,
      todasPermissoesSelecionadas,
      handleToggleSelecionarTodasPermissoes,
      vincularPermissoesEmLote,
      limparSelecaoPermissoes,
      resetAoEntrarNaAba,
    }),
    [
      handleToggleSelecionarTodasPermissoes,
      isSalvandoPermissoes,
      limparSelecaoPermissoes,
      modoPermissao,
      permissoesCamposSelecionados,
      resetAoEntrarNaAba,
      togglePermissaoCampo,
      todasPermissoesSelecionadas,
      vincularPermissoesEmLote,
    ]
  )
}
