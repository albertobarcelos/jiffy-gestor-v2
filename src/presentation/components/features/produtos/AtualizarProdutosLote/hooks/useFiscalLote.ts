'use client'

import { useCallback, useState } from 'react'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { FISCAL_LOTE_VAZIO } from '../constants'
import { montarBodyFiscalLote } from '../rules/fiscalLote.rules'
import type { FiscalLoteDraft, TabPainelLote } from '../types'
import { patchProdutoLote } from '../utils/produtosLoteMutations'
import { useValidacaoFiscalLote } from './useValidacaoFiscalLote'

export interface UseFiscalLoteParams {
  activeTab: TabPainelLote
  produtosSelecionados: Set<string>
  limparSelecaoProdutos: () => void
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'fiscal') => void
  buscarProdutos: () => Promise<unknown>
}

export function useFiscalLote({
  activeTab,
  produtosSelecionados,
  limparSelecaoProdutos,
  marcarProdutosAlteradosNaSessao,
  buscarProdutos,
}: UseFiscalLoteParams) {
  const { auth } = useAuthStore()
  const [fiscalLoteDraft, setFiscalLoteDraft] = useState<FiscalLoteDraft>(FISCAL_LOTE_VAZIO)
  const [isSalvandoFiscal, setIsSalvandoFiscal] = useState(false)
  const [salvandoFiscalProgresso, setSalvandoFiscalProgresso] = useState<{
    atual: number
    total: number
  } | null>(null)

  const validacao = useValidacaoFiscalLote({
    activeTab,
    fiscalLoteDraft,
    setFiscalLoteDraft,
  })

  const {
    ncmValidation,
    isValidatingNcm,
    cestValidation,
    isValidatingCest,
  } = validacao

  const resetDraft = useCallback(() => {
    setFiscalLoteDraft(FISCAL_LOTE_VAZIO)
  }, [])

  /** PATCH sequencial com objeto `fiscal` (sem bulk-update). */
  const aplicarFiscalEmLote = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    const body = montarBodyFiscalLote(fiscalLoteDraft)
    if (!body) {
      showToast.error('Preencha ao menos um campo fiscal')
      return
    }

    const ncmTrimmed = fiscalLoteDraft.ncm.trim()
    if (ncmTrimmed !== '') {
      if (!/^\d{8}$/.test(ncmTrimmed)) {
        showToast.error('O código NCM deve conter exatamente 8 dígitos numéricos.')
        return
      }
      if (ncmValidation && !ncmValidation.valido) {
        showToast.error(ncmValidation.mensagem || 'O código NCM informado não é válido.')
        return
      }
      if (isValidatingNcm) {
        showToast.error('Aguarde a validação do NCM antes de salvar.')
        return
      }
    }

    const cestTrimmed = fiscalLoteDraft.cest.trim()
    if (cestTrimmed !== '') {
      if (!/^\d{7}$/.test(cestTrimmed)) {
        showToast.error('O código CEST deve conter exatamente 7 dígitos numéricos.')
        return
      }
      if (cestValidation && !cestValidation.valido) {
        showToast.error(cestValidation.mensagem || 'O código CEST informado não é válido.')
        return
      }
      if (isValidatingCest) {
        showToast.error('Aguarde a validação do CEST antes de salvar.')
        return
      }
    }

    const indTrimmed = fiscalLoteDraft.indicadorProducaoEscala.trim()
    if (indTrimmed !== '' && cestTrimmed === '') {
      showToast.error(
        'A informação sobre a "Produção em Escala Relevante" foi preenchida sem preencher o código CEST'
      )
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const ids = Array.from(produtosSelecionados)
    const totalIds = ids.length

    setIsSalvandoFiscal(true)
    setSalvandoFiscalProgresso({ atual: 0, total: totalIds })

    let sucesso = 0
    let falhas = 0
    const idsFiscalComSucesso: string[] = []

    try {
      for (let i = 0; i < ids.length; i++) {
        const produtoId = ids[i]
        setSalvandoFiscalProgresso({ atual: i + 1, total: totalIds })

        try {
          await patchProdutoLote(token, produtoId, body)
          sucesso += 1
          idsFiscalComSucesso.push(produtoId)
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : `Erro desconhecido`
          console.error(`Fiscal produto ${produtoId}:`, msg)
          falhas += 1
        }
      }

      marcarProdutosAlteradosNaSessao(idsFiscalComSucesso, 'fiscal')
      await buscarProdutos()
      limparSelecaoProdutos()

      if (falhas === 0) {
        showToast.success(`Dados fiscais atualizados! (${sucesso} produto(s))`)
      } else {
        showToast.warning(
          `${sucesso} atualizado(s) com sucesso. ${falhas} falhou(ram). Verifique o console para detalhes.`
        )
      }
    } catch (error: unknown) {
      console.error('Erro ao aplicar fiscal em lote', error)
      const message = error instanceof Error ? error.message : 'Erro ao aplicar dados fiscais'
      showToast.error(message)
    } finally {
      setIsSalvandoFiscal(false)
      setSalvandoFiscalProgresso(null)
    }
  }, [
    auth,
    buscarProdutos,
    cestValidation,
    fiscalLoteDraft,
    isValidatingCest,
    isValidatingNcm,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    ncmValidation,
    produtosSelecionados,
  ])

  return {
    fiscalLoteDraft,
    setFiscalLoteDraft,
    isSalvandoFiscal,
    salvandoFiscalProgresso,
    aplicarFiscalEmLote,
    resetDraft,
    ...validacao,
  }
}
