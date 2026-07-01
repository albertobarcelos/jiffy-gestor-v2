'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Produto } from '@/src/domain/entities/Produto'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  chaveCelulaFiscal,
  montarPatchFiscalInline,
  validarCampoFiscalInlineLocal,
  valorColunaAlterado,
  valorColunaFiscalProduto,
} from '../rules/fiscalInline.rules'
import type { CelulaFiscalAtiva, FiscalColunaGridId, TabPainelLote } from '../types'
import { patchProdutoLote } from '../utils/produtosLoteMutations'
import { validarCestFiscalInline, validarNcmFiscalInline } from '../utils/fiscalInlineValidacao'

export interface UseFiscalInlineEditParams {
  activeTab: TabPainelLote
  produtos: Produto[]
  marcarProdutosAlteradosNaSessao: (ids: string[], aba: 'fiscal') => void
  atualizarProdutoFiscalLocal: (
    produtoId: string,
    coluna: FiscalColunaGridId,
    valorNormalizado: string | null
  ) => void
}

export interface FiscalInlineEditApi {
  enabled: boolean
  celulaAtiva: CelulaFiscalAtiva | null
  isCelulaAtiva: (produtoId: string, coluna: FiscalColunaGridId) => boolean
  isCelulaSalvando: (produtoId: string, coluna: FiscalColunaGridId) => boolean
  getErroCelula: (produtoId: string, coluna: FiscalColunaGridId) => string | undefined
  getDraft: () => string
  abrirCelula: (produto: Produto, coluna: FiscalColunaGridId) => void
  setDraft: (valor: string) => void
  salvarCelulaAtiva: (valorOverride?: string) => Promise<void>
  cancelarCelulaAtiva: () => void
  isSalvandoInline: boolean
}

export function useFiscalInlineEdit({
  activeTab,
  produtos,
  marcarProdutosAlteradosNaSessao,
  atualizarProdutoFiscalLocal,
}: UseFiscalInlineEditParams): FiscalInlineEditApi {
  const { auth } = useAuthStore()
  const enabled = activeTab === 'fiscal'

  const [celulaAtiva, setCelulaAtiva] = useState<CelulaFiscalAtiva | null>(null)
  const [draftValor, setDraftValor] = useState('')
  const [celulasSalvando, setCelulasSalvando] = useState<Set<string>>(new Set())
  const [celulasErro, setCelulasErro] = useState<Map<string, string>>(new Map())
  const abortRef = useRef<AbortController | null>(null)

  const produtoAtivo = useMemo(() => {
    if (!celulaAtiva) return null
    return produtos.find((p) => p.getId() === celulaAtiva.produtoId) ?? null
  }, [celulaAtiva, produtos])

  const limparErroCelula = useCallback((produtoId: string, coluna: FiscalColunaGridId) => {
    const chave = chaveCelulaFiscal(produtoId, coluna)
    setCelulasErro((prev) => {
      if (!prev.has(chave)) return prev
      const next = new Map(prev)
      next.delete(chave)
      return next
    })
  }, [])

  const cancelarCelulaAtiva = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setCelulaAtiva(null)
    setDraftValor('')
  }, [])

  useEffect(() => {
    if (activeTab !== 'fiscal') {
      cancelarCelulaAtiva()
    }
  }, [activeTab, cancelarCelulaAtiva])

  const abrirCelula = useCallback(
    (produto: Produto, coluna: FiscalColunaGridId) => {
      if (!enabled) return

      const produtoId = produto.getId()
      if (celulaAtiva?.produtoId === produtoId && celulaAtiva.coluna === coluna) return

      abortRef.current?.abort()
      abortRef.current = null

      setCelulaAtiva({ produtoId, coluna })
      setDraftValor(valorColunaFiscalProduto(produto, coluna))
      limparErroCelula(produtoId, coluna)
    },
    [celulaAtiva, enabled, limparErroCelula]
  )

  const setDraft = useCallback((valor: string) => {
    setDraftValor(valor)
  }, [])

  const salvarCelulaAtiva = useCallback(async (valorOverride?: string) => {
    if (!celulaAtiva || !produtoAtivo) return

    const { produtoId, coluna } = celulaAtiva
    const chave = chaveCelulaFiscal(produtoId, coluna)
    const valorBruto = valorOverride ?? draftValor

    const validacaoLocal = validarCampoFiscalInlineLocal(produtoAtivo, coluna, valorBruto)
    if (!validacaoLocal.ok) {
      setCelulasErro((prev) => new Map(prev).set(chave, validacaoLocal.mensagem))
      showToast.error(validacaoLocal.mensagem)
      return
    }

    if (!valorColunaAlterado(produtoAtivo, coluna, validacaoLocal.valorNormalizado)) {
      cancelarCelulaAtiva()
      return
    }

    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (coluna === 'ncm' && validacaoLocal.valorNormalizado !== null) {
      const ncmResult = await validarNcmFiscalInline(
        token,
        validacaoLocal.valorNormalizado,
        controller.signal
      )
      if (controller.signal.aborted) return
      if (ncmResult && !ncmResult.valido) {
        const msg = ncmResult.mensagem || 'O código NCM informado não é válido.'
        setCelulasErro((prev) => new Map(prev).set(chave, msg))
        showToast.error(msg)
        return
      }
    }

    if (coluna === 'cest' && validacaoLocal.valorNormalizado !== null) {
      const cestResult = await validarCestFiscalInline(
        token,
        validacaoLocal.valorNormalizado,
        produtoAtivo.getNcm(),
        controller.signal
      )
      if (controller.signal.aborted) return
      if (cestResult && !cestResult.valido) {
        const msg = cestResult.mensagem || 'O código CEST informado não é válido.'
        setCelulasErro((prev) => new Map(prev).set(chave, msg))
        showToast.error(msg)
        return
      }
    }

    const body = montarPatchFiscalInline(coluna, validacaoLocal.valorNormalizado)

    setCelulasSalvando((prev) => new Set(prev).add(chave))
    limparErroCelula(produtoId, coluna)

    try {
      await patchProdutoLote(token, produtoId, body)
      marcarProdutosAlteradosNaSessao([produtoId], 'fiscal')
      atualizarProdutoFiscalLocal(produtoId, coluna, validacaoLocal.valorNormalizado)
      showToast.success('Dado fiscal atualizado')
      cancelarCelulaAtiva()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar dado fiscal'
      setCelulasErro((prev) => new Map(prev).set(chave, msg))
      showToast.error(msg)
    } finally {
      setCelulasSalvando((prev) => {
        const next = new Set(prev)
        next.delete(chave)
        return next
      })
    }
  }, [
    auth,
    atualizarProdutoFiscalLocal,
    cancelarCelulaAtiva,
    celulaAtiva,
    draftValor,
    limparErroCelula,
    marcarProdutosAlteradosNaSessao,
    produtoAtivo,
  ])

  const isCelulaAtiva = useCallback(
    (produtoId: string, coluna: FiscalColunaGridId) =>
      celulaAtiva?.produtoId === produtoId && celulaAtiva.coluna === coluna,
    [celulaAtiva]
  )

  const isCelulaSalvando = useCallback(
    (produtoId: string, coluna: FiscalColunaGridId) =>
      celulasSalvando.has(chaveCelulaFiscal(produtoId, coluna)),
    [celulasSalvando]
  )

  const getErroCelula = useCallback(
    (produtoId: string, coluna: FiscalColunaGridId) =>
      celulasErro.get(chaveCelulaFiscal(produtoId, coluna)),
    [celulasErro]
  )

  const isSalvandoInline = celulasSalvando.size > 0

  return useMemo(
    () => ({
      enabled,
      celulaAtiva,
      isCelulaAtiva,
      isCelulaSalvando,
      getErroCelula,
      getDraft: () => draftValor,
      abrirCelula,
      setDraft,
      salvarCelulaAtiva,
      cancelarCelulaAtiva,
      isSalvandoInline,
    }),
    [
      abrirCelula,
      cancelarCelulaAtiva,
      celulaAtiva,
      draftValor,
      enabled,
      getErroCelula,
      isCelulaAtiva,
      isCelulaSalvando,
      isSalvandoInline,
      salvarCelulaAtiva,
      setDraft,
    ]
  )
}
