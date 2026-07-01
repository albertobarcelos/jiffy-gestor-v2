'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { CAMPOS_FISCAL_LOTE, FISCAL_LOTE_VAZIO } from '../constants'
import {
  montarBulkUpdateItemsFiscal,
  montarBulkUpdateItemsLimparFiscal,
  produtosSelecionadosSemCest,
} from '../rules/fiscalLote.rules'
import type { FiscalCampoChave, ModoFiscalLote, TabPainelLote } from '../types'
import { bulkUpdateProdutosLote } from '../utils/produtosLoteMutations'
import { useValidacaoFiscalLote } from './useValidacaoFiscalLote'

export interface UseFiscalLoteParams {
  activeTab: TabPainelLote
  produtos: Produto[]
  produtosSelecionados: Set<string>
  limparSelecaoProdutos: () => void
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'fiscal') => void
  buscarProdutos: () => Promise<unknown>
}

async function processarResultadoBulkFiscal(
  ids: string[],
  payloadLength: number,
  resultado: Awaited<ReturnType<typeof bulkUpdateProdutosLote>>,
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'fiscal') => void,
  buscarProdutos: () => Promise<unknown>,
  limparSelecaoProdutos: () => void,
  mensagemSucesso: string
) {
  const falhas = resultado.falhas ?? []
  const idsComSucesso =
    resultado.produtosIds?.filter((id) => !falhas.some((f) => f.produtoId === id)) ??
    ids.filter((id) => !falhas.some((f) => f.produtoId === id))

  marcarProdutosAlteradosNaSessao(idsComSucesso, 'fiscal')
  await buscarProdutos()
  limparSelecaoProdutos()

  if (falhas.length === 0) {
    const total = resultado.produtosIds?.length ?? payloadLength
    showToast.success(`${mensagemSucesso} (${total} produto(s))`)
  } else if (idsComSucesso.length > 0) {
    showToast.warning(
      `${idsComSucesso.length} atualizado(s) com sucesso. ${falhas.length} falhou(ram). Verifique o console para detalhes.`
    )
    falhas.forEach((f) => console.error(`Fiscal produto ${f.produtoId}:`, f.message))
  } else {
    showToast.error('Nenhum produto foi atualizado. Verifique o console para detalhes.')
    falhas.forEach((f) => console.error(`Fiscal produto ${f.produtoId}:`, f.message))
  }
}

export function useFiscalLote({
  activeTab,
  produtos,
  produtosSelecionados,
  limparSelecaoProdutos,
  marcarProdutosAlteradosNaSessao,
  buscarProdutos,
}: UseFiscalLoteParams) {
  const { auth } = useAuthStore()
  const [modoFiscal, setModoFiscalState] = useState<ModoFiscalLote>('editar')
  const [fiscalLoteDraft, setFiscalLoteDraft] = useState(FISCAL_LOTE_VAZIO)
  const [fiscalCamposLimparSelecionados, setFiscalCamposLimparSelecionados] = useState<
    Set<FiscalCampoChave>
  >(new Set())
  const [isSalvandoFiscal, setIsSalvandoFiscal] = useState(false)

  const validacao = useValidacaoFiscalLote({
    activeTab,
    modoFiscal,
    fiscalLoteDraft,
    setFiscalLoteDraft,
  })

  const {
    ncmValidation,
    isValidatingNcm,
    cestValidation,
    isValidatingCest,
  } = validacao

  const limparSelecaoCamposLimpar = useCallback(() => {
    setFiscalCamposLimparSelecionados(new Set())
  }, [])

  const setModoFiscal = useCallback((modo: ModoFiscalLote) => {
    setModoFiscalState((prev) => {
      if (prev !== modo) {
        setFiscalLoteDraft(FISCAL_LOTE_VAZIO)
        setFiscalCamposLimparSelecionados(new Set())
      }
      return modo
    })
  }, [])

  const toggleFiscalCampoLimpar = useCallback((chave: FiscalCampoChave) => {
    setFiscalCamposLimparSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(chave)) {
        novo.delete(chave)
      } else {
        novo.add(chave)
      }
      return novo
    })
  }, [])

  const todasFiscaisLimparSelecionadas =
    CAMPOS_FISCAL_LOTE.length > 0 &&
    fiscalCamposLimparSelecionados.size === CAMPOS_FISCAL_LOTE.length

  const handleToggleSelecionarTodasFiscalLimpar = useCallback(() => {
    if (todasFiscaisLimparSelecionadas) {
      setFiscalCamposLimparSelecionados(new Set())
    } else {
      setFiscalCamposLimparSelecionados(new Set(CAMPOS_FISCAL_LOTE.map((c) => c.chave)))
    }
  }, [todasFiscaisLimparSelecionadas])

  const resetDraft = useCallback(() => {
    setModoFiscalState('editar')
    setFiscalLoteDraft(FISCAL_LOTE_VAZIO)
    setFiscalCamposLimparSelecionados(new Set())
  }, [])

  /** Limpa apenas os campos do formulário (não altera produtos). */
  const limparInputsFormulario = useCallback(() => {
    if (modoFiscal === 'editar') {
      setFiscalLoteDraft(FISCAL_LOTE_VAZIO)
      return
    }
    setFiscalCamposLimparSelecionados(new Set())
  }, [modoFiscal])

  const aplicarEditarFiscal = useCallback(async () => {
    const ids = Array.from(produtosSelecionados)
    const payload = montarBulkUpdateItemsFiscal(ids, fiscalLoteDraft)
    if (!payload) {
      showToast.error('Preencha ao menos um campo fiscal')
      return
    }

    const ncmTrimmed = fiscalLoteDraft.ncm.trim()
    if (ncmTrimmed !== '') {
      if (!/^\d{8}$/.test(ncmTrimmed.replace(/\D/g, '').slice(0, 8))) {
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
      if (!/^\d{7}$/.test(cestTrimmed.replace(/\D/g, '').slice(0, 7))) {
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
      const semCest = produtosSelecionadosSemCest(ids, produtos)
      if (semCest.length > 0) {
        const preview = semCest
          .slice(0, 3)
          .map((p) => p.getNome())
          .join(', ')
        const sufixo = semCest.length > 3 ? ` (+${semCest.length - 3})` : ''
        showToast.error(
          `Indicador de Produção em Escala exige CEST cadastrado. Produto(s) sem CEST: ${preview}${sufixo}`
        )
        return
      }
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    setIsSalvandoFiscal(true)
    try {
      const resultado = await bulkUpdateProdutosLote(token, payload)
      await processarResultadoBulkFiscal(
        ids,
        payload.length,
        resultado,
        marcarProdutosAlteradosNaSessao,
        buscarProdutos,
        limparSelecaoProdutos,
        'Dados fiscais atualizados!'
      )
    } catch (error: unknown) {
      console.error('Erro ao aplicar fiscal em lote', error)
      const message = error instanceof Error ? error.message : 'Erro ao aplicar dados fiscais'
      showToast.error(message)
    } finally {
      setIsSalvandoFiscal(false)
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
    produtos,
    produtosSelecionados,
  ])

  const aplicarLimparFiscal = useCallback(async () => {
    if (fiscalCamposLimparSelecionados.size === 0) {
      showToast.error('Selecione ao menos um campo fiscal para limpar')
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    const ids = Array.from(produtosSelecionados)
    const payload = montarBulkUpdateItemsLimparFiscal(ids, fiscalCamposLimparSelecionados)
    if (!payload) {
      showToast.error('Selecione ao menos um campo fiscal para limpar')
      return
    }

    setIsSalvandoFiscal(true)
    try {
      const resultado = await bulkUpdateProdutosLote(token, payload)
      await processarResultadoBulkFiscal(
        ids,
        payload.length,
        resultado,
        marcarProdutosAlteradosNaSessao,
        buscarProdutos,
        limparSelecaoProdutos,
        'Campos fiscais limpos!'
      )
    } catch (error: unknown) {
      console.error('Erro ao limpar fiscal em lote', error)
      const message = error instanceof Error ? error.message : 'Erro ao limpar dados fiscais'
      showToast.error(message)
    } finally {
      setIsSalvandoFiscal(false)
    }
  }, [
    auth,
    buscarProdutos,
    fiscalCamposLimparSelecionados,
    limparSelecaoProdutos,
    marcarProdutosAlteradosNaSessao,
    produtosSelecionados,
  ])

  const aplicarFiscalEmLote = useCallback(async () => {
    if (produtosSelecionados.size === 0) {
      showToast.error('Selecione pelo menos um produto')
      return
    }

    if (modoFiscal === 'limpar') {
      await aplicarLimparFiscal()
    } else {
      await aplicarEditarFiscal()
    }
  }, [aplicarEditarFiscal, aplicarLimparFiscal, modoFiscal, produtosSelecionados.size])

  const podeAplicarEditar = useMemo(() => {
    const temAlgumValor =
      fiscalLoteDraft.ncm.trim() !== '' ||
      fiscalLoteDraft.cest.trim() !== '' ||
      fiscalLoteDraft.origemMercadoria !== '' ||
      fiscalLoteDraft.tipoProduto.trim() !== '' ||
      fiscalLoteDraft.indicadorProducaoEscala.trim() !== ''
    return (
      temAlgumValor &&
      !validacao.isNcmInvalidFiscal &&
      !validacao.isCestInvalidFiscal &&
      !isValidatingNcm &&
      !isValidatingCest
    )
  }, [fiscalLoteDraft, isValidatingCest, isValidatingNcm, validacao.isCestInvalidFiscal, validacao.isNcmInvalidFiscal])

  const formularioFiscalTemConteudo = useMemo(() => {
    if (modoFiscal === 'editar') {
      return (
        fiscalLoteDraft.ncm.trim() !== '' ||
        fiscalLoteDraft.cest.trim() !== '' ||
        fiscalLoteDraft.origemMercadoria !== '' ||
        fiscalLoteDraft.tipoProduto.trim() !== '' ||
        fiscalLoteDraft.indicadorProducaoEscala.trim() !== ''
      )
    }
    return fiscalCamposLimparSelecionados.size > 0
  }, [fiscalCamposLimparSelecionados.size, fiscalLoteDraft, modoFiscal])

  return {
    modoFiscal,
    setModoFiscal,
    fiscalLoteDraft,
    setFiscalLoteDraft,
    fiscalCamposLimparSelecionados,
    toggleFiscalCampoLimpar,
    todasFiscaisLimparSelecionadas,
    handleToggleSelecionarTodasFiscalLimpar,
    limparSelecaoCamposLimpar,
    isSalvandoFiscal,
    salvandoFiscalProgresso: null,
    aplicarFiscalEmLote,
    podeAplicarEditar,
    podeAplicarLimpar: fiscalCamposLimparSelecionados.size > 0,
    formularioFiscalTemConteudo,
    limparInputsFormulario,
    resetDraft,
    ...validacao,
  }
}
