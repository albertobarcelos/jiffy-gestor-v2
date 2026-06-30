'use client'

import { useCallback, useMemo, useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { CAMPOS_PERMISSAO_PDV } from '../constants'
import { montarBodyPermissoesParcial } from '../rules/permissoesLote.rules'
import type { PermissaoCampoChave } from '../types'
import { patchProdutoLote } from '../utils/produtosLoteMutations'

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
  const [salvandoPermissoesProgresso, setSalvandoPermissoesProgresso] = useState<{
    atual: number
    total: number
  } | null>(null)

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

  /** PATCH sequencial por produto (sem bulk-update); mesmo contrato que NovoProduto em edição. */
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
    const total = ids.length
    const valorAlvo = modoPermissao === 'ativar'
    const body = montarBodyPermissoesParcial(permissoesCamposSelecionados, valorAlvo)

    setIsSalvandoPermissoes(true)
    setSalvandoPermissoesProgresso({ atual: 0, total })

    let sucesso = 0
    let falhas = 0
    const idsPermissaoComSucesso: string[] = []

    try {
      for (let i = 0; i < ids.length; i++) {
        const produtoId = ids[i]
        setSalvandoPermissoesProgresso({ atual: i + 1, total })

        try {
          await patchProdutoLote(token, produtoId, body)
          sucesso += 1
          idsPermissaoComSucesso.push(produtoId)
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : `Erro desconhecido`
          console.error(`Permissões produto ${produtoId}:`, msg)
          falhas += 1
        }
      }

      marcarProdutosAlteradosNaSessao(idsPermissaoComSucesso, 'permissoes')
      await buscarProdutos()
      limparSelecaoProdutos()

      if (falhas === 0) {
        const acao = modoPermissao === 'ativar' ? 'ativadas' : 'desativadas'
        showToast.success(`Permissões ${acao} com sucesso! (${sucesso} produto(s))`)
      } else {
        showToast.warning(
          `${sucesso} atualizado(s) com sucesso. ${falhas} falhou(ram). Verifique o console para detalhes.`
        )
      }
    } catch (error: unknown) {
      console.error('Erro ao vincular permissões em lote', error)
      const message = error instanceof Error ? error.message : 'Erro ao vincular permissões'
      showToast.error(message)
    } finally {
      setIsSalvandoPermissoes(false)
      setSalvandoPermissoesProgresso(null)
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
      salvandoPermissoesProgresso,
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
      salvandoPermissoesProgresso,
      togglePermissaoCampo,
      todasPermissoesSelecionadas,
      vincularPermissoesEmLote,
    ]
  )
}
