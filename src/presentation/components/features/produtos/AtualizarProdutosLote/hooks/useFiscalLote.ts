'use client'

import { useCallback, useMemo, useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { CAMPOS_FISCAL_LOTE, FISCAL_LOTE_VAZIO } from '../constants'
import {
  mapearErrosDetalheFiscalLote,
  montarPayloadFiscalLote,
  montarPayloadLimparFiscalLote,
  ncmComumDosProdutosSelecionados,
  produtosSelecionadosSemCest,
  produtosSelecionadosSemNcm,
  type FiscalLoteRequestPayload,
} from '../rules/fiscalLote.rules'
import type {
  FiscalCampoChave,
  FiscalLoteFalhaExibida,
  ModoFiscalLote,
  TabPainelLote,
} from '../types'
import {
  atualizarFiscalProdutosLote,
  type FiscalLoteApiResponse,
} from '../utils/produtosLoteMutations'
import { useValidacaoFiscalLote } from './useValidacaoFiscalLote'

export interface UseFiscalLoteParams {
  activeTab: TabPainelLote
  produtos: Produto[]
  produtosSelecionados: Set<string>
  setProdutosSelecionados: (ids: Set<string>) => void
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'fiscal') => void
  buscarProdutos: () => Promise<unknown>
}

type ProcessarResultadoParams = {
  status: number
  data: FiscalLoteApiResponse
  produtos: Produto[]
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'fiscal') => void
  setProdutosSelecionados: (ids: Set<string>) => void
  buscarProdutos: () => Promise<unknown>
  mensagemSucesso: string
  onFalhas: (falhas: FiscalLoteFalhaExibida[]) => void
}

async function processarResultadoFiscalLote({
  status,
  data,
  produtos,
  marcarProdutosAlteradosNaSessao,
  setProdutosSelecionados,
  buscarProdutos,
  mensagemSucesso,
  onFalhas,
}: ProcessarResultadoParams) {
  const produtosOk = Array.isArray(data.produtos) ? data.produtos : []
  const errosDetalheRaw = Array.isArray(data.errosDetalhe) ? data.errosDetalhe : []
  const falhasExibidas = mapearErrosDetalheFiscalLote(errosDetalheRaw, produtos)
  const idsComSucesso = produtosOk
    .map(p => p.produtoId)
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '')

  const sucesso = idsComSucesso.length
  const falhas =
    typeof data.erros === 'number' && data.erros > 0
      ? data.erros
      : falhasExibidas.length

  if (idsComSucesso.length > 0) {
    marcarProdutosAlteradosNaSessao(idsComSucesso, 'fiscal')
  }

  await buscarProdutos()

  // Mantém selecionados só os que falharam (facilita retentar / corrigir NCM).
  if (falhasExibidas.length > 0) {
    setProdutosSelecionados(new Set(falhasExibidas.map(f => f.produtoId)))
    onFalhas(falhasExibidas)
  } else {
    setProdutosSelecionados(new Set())
    onFalhas([])
  }

  if (status >= 200 && status < 300 && falhas === 0) {
    showToast.success(`${mensagemSucesso} (${sucesso} produto(s))`)
    return
  }

  if (sucesso > 0) {
    const primeiraMsg = falhasExibidas[0]?.mensagem
    showToast.warning(
      primeiraMsg
        ? `${sucesso} atualizado(s). ${falhas} falhou(ram): ${primeiraMsg}`
        : `${sucesso} atualizado(s) com sucesso. ${falhas} falhou(ram).`
    )
    return
  }

  const msgErro =
    falhasExibidas[0]?.mensagem ||
    (typeof data.message === 'string' && data.message.trim() !== ''
      ? data.message.trim()
      : 'Não foi possível atualizar os dados fiscais.')
  showToast.error(msgErro)
}

export function useFiscalLote({
  activeTab,
  produtos,
  produtosSelecionados,
  setProdutosSelecionados,
  marcarProdutosAlteradosNaSessao,
  buscarProdutos,
}: UseFiscalLoteParams) {
  const [modoFiscal, setModoFiscalState] = useState<ModoFiscalLote>('editar')
  const [fiscalLoteDraft, setFiscalLoteDraft] = useState(FISCAL_LOTE_VAZIO)
  const [fiscalCamposLimparSelecionados, setFiscalCamposLimparSelecionados] = useState<
    Set<FiscalCampoChave>
  >(new Set())
  const [isSalvandoFiscal, setIsSalvandoFiscal] = useState(false)
  const [falhasFiscalLote, setFalhasFiscalLote] = useState<FiscalLoteFalhaExibida[]>([])

  const fiscalLoteMutation = useSecureTenantMutation(
    async ({ token }, payload: FiscalLoteRequestPayload) =>
      atualizarFiscalProdutosLote(token, payload)
  )

  const ncmContextoSelecao = useMemo(
    () =>
      ncmComumDosProdutosSelecionados(Array.from(produtosSelecionados), produtos),
    [produtos, produtosSelecionados]
  )

  const validacao = useValidacaoFiscalLote({
    activeTab,
    modoFiscal,
    fiscalLoteDraft,
    setFiscalLoteDraft,
    ncmContextoSelecao,
  })

  const { ncmValidation, isValidatingNcm, cestValidation, isValidatingCest } = validacao

  const limparSelecaoCamposLimpar = useCallback(() => {
    setFiscalCamposLimparSelecionados(new Set())
  }, [])

  const fecharFalhasFiscalLote = useCallback(() => {
    setFalhasFiscalLote([])
  }, [])

  const setModoFiscal = useCallback((modo: ModoFiscalLote) => {
    setModoFiscalState(prev => {
      if (prev !== modo) {
        setFiscalLoteDraft(FISCAL_LOTE_VAZIO)
        setFiscalCamposLimparSelecionados(new Set())
      }
      return modo
    })
  }, [])

  const toggleFiscalCampoLimpar = useCallback((chave: FiscalCampoChave) => {
    setFiscalCamposLimparSelecionados(prev => {
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
      setFiscalCamposLimparSelecionados(new Set(CAMPOS_FISCAL_LOTE.map(c => c.chave)))
    }
  }, [todasFiscaisLimparSelecionadas])

  const resetDraft = useCallback(() => {
    setModoFiscalState('editar')
    setFiscalLoteDraft(FISCAL_LOTE_VAZIO)
    setFiscalCamposLimparSelecionados(new Set())
    setFalhasFiscalLote([])
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
    const payload = montarPayloadFiscalLote(ids, fiscalLoteDraft)
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

      // CEST exige NCM: no formulário em lote ou já cadastrado em cada produto selecionado.
      if (ncmTrimmed === '') {
        const semNcm = produtosSelecionadosSemNcm(ids, produtos)
        if (semNcm.length > 0) {
          const preview = semNcm
            .slice(0, 3)
            .map(p => p.getNome())
            .join(', ')
          const sufixo = semNcm.length > 3 ? ` (+${semNcm.length - 3})` : ''
          showToast.error(
            `CEST exige NCM. Informe o NCM no formulário ou selecione apenas produtos que já tenham NCM. Sem NCM: ${preview}${sufixo}`
          )
          return
        }
      }
    }

    const indTrimmed = fiscalLoteDraft.indicadorProducaoEscala.trim()
    if (indTrimmed !== '' && cestTrimmed === '') {
      const semCest = produtosSelecionadosSemCest(ids, produtos)
      if (semCest.length > 0) {
        const preview = semCest
          .slice(0, 3)
          .map(p => p.getNome())
          .join(', ')
        const sufixo = semCest.length > 3 ? ` (+${semCest.length - 3})` : ''
        showToast.error(
          `Indicador de Produção em Escala exige CEST cadastrado. Produto(s) sem CEST: ${preview}${sufixo}`
        )
        return
      }
    }

    setIsSalvandoFiscal(true)
    try {
      const { status, data } = await fiscalLoteMutation.mutateAsync(payload)
      await processarResultadoFiscalLote({
        status,
        data,
        produtos,
        marcarProdutosAlteradosNaSessao,
        setProdutosSelecionados,
        buscarProdutos,
        mensagemSucesso: 'Dados fiscais atualizados!',
        onFalhas: setFalhasFiscalLote,
      })
    } catch (error: unknown) {
      console.error('Erro ao aplicar fiscal em lote', error)
      const message = error instanceof Error ? error.message : 'Erro ao aplicar dados fiscais'
      showToast.error(message)
    } finally {
      setIsSalvandoFiscal(false)
    }
  }, [
    buscarProdutos,
    cestValidation,
    fiscalLoteDraft,
    fiscalLoteMutation,
    isValidatingCest,
    isValidatingNcm,
    marcarProdutosAlteradosNaSessao,
    ncmValidation,
    produtos,
    produtosSelecionados,
    setProdutosSelecionados,
  ])

  const aplicarLimparFiscal = useCallback(async () => {
    if (fiscalCamposLimparSelecionados.size === 0) {
      showToast.error('Selecione ao menos um campo fiscal para limpar')
      return
    }

    const ids = Array.from(produtosSelecionados)
    const payload = montarPayloadLimparFiscalLote(ids, fiscalCamposLimparSelecionados)
    if (!payload) {
      showToast.error('Selecione ao menos um campo fiscal para limpar')
      return
    }

    setIsSalvandoFiscal(true)
    try {
      const { status, data } = await fiscalLoteMutation.mutateAsync(payload)
      await processarResultadoFiscalLote({
        status,
        data,
        produtos,
        marcarProdutosAlteradosNaSessao,
        setProdutosSelecionados,
        buscarProdutos,
        mensagemSucesso: 'Campos fiscais limpos!',
        onFalhas: setFalhasFiscalLote,
      })
    } catch (error: unknown) {
      console.error('Erro ao limpar fiscal em lote', error)
      const message = error instanceof Error ? error.message : 'Erro ao limpar dados fiscais'
      showToast.error(message)
    } finally {
      setIsSalvandoFiscal(false)
    }
  }, [
    buscarProdutos,
    fiscalCamposLimparSelecionados,
    fiscalLoteMutation,
    marcarProdutosAlteradosNaSessao,
    produtos,
    produtosSelecionados,
    setProdutosSelecionados,
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
    const ncmTrimmed = fiscalLoteDraft.ncm.trim()
    const cestTrimmed = fiscalLoteDraft.cest.trim()
    const temAlgumValor =
      ncmTrimmed !== '' ||
      cestTrimmed !== '' ||
      fiscalLoteDraft.origemMercadoria !== '' ||
      fiscalLoteDraft.tipoProduto.trim() !== '' ||
      fiscalLoteDraft.indicadorProducaoEscala.trim() !== ''

    // NCM/CEST parciais ou ainda em validação não liberam o botão.
    const ncmPronto =
      ncmTrimmed === '' ||
      (/^\d{8}$/.test(ncmTrimmed.replace(/\D/g, '').slice(0, 8)) &&
        ncmValidation?.valido === true &&
        !isValidatingNcm)
    const cestPronto =
      cestTrimmed === '' ||
      (/^\d{7}$/.test(cestTrimmed.replace(/\D/g, '').slice(0, 7)) &&
        cestValidation?.valido === true &&
        !isValidatingCest)

    return (
      temAlgumValor &&
      ncmPronto &&
      cestPronto &&
      !validacao.isNcmInvalidFiscal &&
      !validacao.isCestInvalidFiscal
    )
  }, [
    cestValidation,
    fiscalLoteDraft,
    isValidatingCest,
    isValidatingNcm,
    ncmValidation,
    validacao.isCestInvalidFiscal,
    validacao.isNcmInvalidFiscal,
  ])

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
    aplicarFiscalEmLote,
    podeAplicarEditar,
    podeAplicarLimpar: fiscalCamposLimparSelecionados.size > 0,
    formularioFiscalTemConteudo,
    limparInputsFormulario,
    resetDraft,
    falhasFiscalLote,
    fecharFalhasFiscalLote,
    ...validacao,
  }
}
