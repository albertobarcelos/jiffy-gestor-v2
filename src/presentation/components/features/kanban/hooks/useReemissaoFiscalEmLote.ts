'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { invalidateKanbanVendasListagens } from '@/features/kanban/hooks/kanbanListagemQueryCache'
import { showToast } from '@/src/shared/utils/toast'
import { vendaElegivelParaReemissaoAutomaticaLote } from '../rules/vendasKanban.rules'
import { enviarReemissaoFiscalKanban } from '../services/enviarReemissaoFiscalKanban'
import type { Venda } from '../types'

/** Intervalo entre cada envio ao fiscal (evita timeout por excesso de requisições). */
export const REEMISSAO_FISCAL_LOTE_INTERVALO_MS = 2000

/** Mínimo de notas rejeitadas elegíveis para exibir o botão de reemissão em lote. */
export const REEMISSAO_FISCAL_LOTE_MIN_ELEGIVEIS = 5

export type ReemissaoFiscalLoteStatus = 'idle' | 'running' | 'paused' | 'concluido'

export interface ReemissaoFiscalLoteProgresso {
  status: ReemissaoFiscalLoteStatus
  enviadas: number
  erros: number
  totalElegiveisVisiveis: number
  vendaAtualLabel?: string
}

interface UseReemissaoFiscalEmLoteParams {
  /** Vendas da coluna/filtro Rejeitadas (fonte do lote). */
  vendasRejeitadas: Venda[]
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
  fetchNextPage: () => void | Promise<unknown>
  hasNextPage: boolean
  refetchListagem: () => Promise<void>
}

function rotuloVendaKanban(venda: Venda): string {
  if (venda.numeroVenda != null) return `#${venda.numeroVenda}`
  if (venda.codigoVenda?.trim()) return venda.codigoVenda.trim()
  return venda.id.slice(0, 8)
}

export function useReemissaoFiscalEmLote({
  vendasRejeitadas,
  acaoFiscalEmAndamentoPorVenda,
  fetchNextPage,
  hasNextPage,
  refetchListagem,
}: UseReemissaoFiscalEmLoteParams) {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()

  const [progresso, setProgresso] = useState<ReemissaoFiscalLoteProgresso>({
    status: 'idle',
    enviadas: 0,
    erros: 0,
    totalElegiveisVisiveis: 0,
  })
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false)

  const processadasRef = useRef(new Set<string>())
  const cancelarRef = useRef(false)
  const pausadoRef = useRef(false)
  const vendasRef = useRef(vendasRejeitadas)
  const acaoFiscalRef = useRef(acaoFiscalEmAndamentoPorVenda)
  const hasNextPageRef = useRef(hasNextPage)

  vendasRef.current = vendasRejeitadas
  acaoFiscalRef.current = acaoFiscalEmAndamentoPorVenda
  hasNextPageRef.current = hasNextPage

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const listarElegiveisPendentes = useCallback((): Venda[] => {
    return vendasRef.current.filter(
      v =>
        !processadasRef.current.has(v.id) &&
        vendaElegivelParaReemissaoAutomaticaLote(v, acaoFiscalRef.current)
    )
  }, [])

  const totalElegiveisVisiveis = useMemo(
    () =>
      vendasRejeitadas.filter(v =>
        vendaElegivelParaReemissaoAutomaticaLote(v, acaoFiscalEmAndamentoPorVenda)
      ).length,
    [vendasRejeitadas, acaoFiscalEmAndamentoPorVenda]
  )

  const exibirBarraReemissaoEmLote = useMemo(
    () =>
      totalElegiveisVisiveis > REEMISSAO_FISCAL_LOTE_MIN_ELEGIVEIS ||
      progresso.status === 'running' ||
      progresso.status === 'paused' ||
      progresso.status === 'concluido',
    [totalElegiveisVisiveis, progresso.status]
  )

  useEffect(() => {
    if (progresso.status === 'idle' || progresso.status === 'concluido') {
      setProgresso(prev => ({ ...prev, totalElegiveisVisiveis }))
    }
  }, [totalElegiveisVisiveis, progresso.status])

  const invalidarListagemKanban = useCallback(async () => {
    invalidateKanbanVendasListagens(queryClient)
    await refetchListagem()
  }, [queryClient, refetchListagem])

  const executarLoop = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) {
      showToast.error('Sessão expirada. Faça login novamente.')
      setProgresso(prev => ({ ...prev, status: 'idle' }))
      return
    }

    let tentativasSemProgresso = 0
    let enviadas = 0
    let erros = 0

    while (!cancelarRef.current) {
      while (pausadoRef.current && !cancelarRef.current) {
        await sleep(300)
      }
      if (cancelarRef.current) break

      const elegiveis = listarElegiveisPendentes()
      if (elegiveis.length === 0) {
        if (hasNextPageRef.current) {
          tentativasSemProgresso += 1
          if (tentativasSemProgresso > 30) break
          await Promise.resolve(fetchNextPage())
          await sleep(800)
          continue
        }
        break
      }

      tentativasSemProgresso = 0
      const venda = elegiveis[0]
      setProgresso(prev => ({
        ...prev,
        vendaAtualLabel: rotuloVendaKanban(venda),
      }))

      try {
        await enviarReemissaoFiscalKanban(token, venda)
        processadasRef.current.add(venda.id)
        enviadas += 1
        setProgresso(prev => ({
          ...prev,
          enviadas,
        }))
      } catch (error) {
        processadasRef.current.add(venda.id)
        erros += 1
        setProgresso(prev => ({
          ...prev,
          erros,
        }))
        console.error('[reemissão em lote]', rotuloVendaKanban(venda), error)
      }

      const totalProcessado = enviadas + erros
      if (totalProcessado > 0 && totalProcessado % 10 === 0) {
        await invalidarListagemKanban()
      }

      await sleep(REEMISSAO_FISCAL_LOTE_INTERVALO_MS)
    }

    await invalidarListagemKanban()

    const foiCancelado = cancelarRef.current
    setProgresso(prev => ({
      ...prev,
      status: foiCancelado ? 'idle' : 'concluido',
      vendaAtualLabel: undefined,
      enviadas,
      erros,
    }))

    if (!foiCancelado) {
      showToast.success(
        `Lote concluído: ${enviadas} enviada(s)${erros > 0 ? `, ${erros} erro(s)` : ''}.`
      )
    }
  }, [auth, fetchNextPage, invalidarListagemKanban, listarElegiveisPendentes])

  const iniciar = useCallback(() => {
    if (totalElegiveisVisiveis === 0) {
      showToast.info('Nenhuma venda elegível para reemissão automática nesta coluna.')
      return
    }
    setConfirmacaoAberta(true)
  }, [totalElegiveisVisiveis])

  const confirmarInicio = useCallback(() => {
    setConfirmacaoAberta(false)
    cancelarRef.current = false
    pausadoRef.current = false
    processadasRef.current = new Set()
    setProgresso({
      status: 'running',
      enviadas: 0,
      erros: 0,
      totalElegiveisVisiveis,
    })
    void executarLoop()
  }, [executarLoop, totalElegiveisVisiveis])

  const pausar = useCallback(() => {
    if (progresso.status !== 'running') return
    pausadoRef.current = true
    setProgresso(prev => ({ ...prev, status: 'paused' }))
  }, [progresso.status])

  const retomar = useCallback(() => {
    if (progresso.status !== 'paused') return
    pausadoRef.current = false
    setProgresso(prev => ({ ...prev, status: 'running' }))
  }, [progresso.status])

  const parar = useCallback(() => {
    cancelarRef.current = true
    pausadoRef.current = false
    setProgresso(prev => ({
      ...prev,
      status: 'idle',
      vendaAtualLabel: undefined,
    }))
    showToast.info('Reemissão em lote interrompida.')
  }, [])

  const encerrarResumo = useCallback(() => {
    setProgresso(prev => ({
      ...prev,
      status: 'idle',
      enviadas: 0,
      erros: 0,
      vendaAtualLabel: undefined,
    }))
  }, [])

  return {
    progresso,
    totalElegiveisVisiveis,
    exibirBarraReemissaoEmLote,
    confirmacaoAberta,
    setConfirmacaoAberta,
    iniciar,
    confirmarInicio,
    pausar,
    retomar,
    parar,
    encerrarResumo,
    intervaloSegundos: REEMISSAO_FISCAL_LOTE_INTERVALO_MS / 1000,
  }
}
