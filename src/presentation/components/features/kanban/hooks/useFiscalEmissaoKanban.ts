import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { flushSync } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import { resolveModeloParaEmitirNota } from './useVendasUnificadas'
import { deveUsarModuloDeliveryParaEmissaoFiscal } from '@/src/presentation/hooks/useVendas'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { fiscalPendentePodeReemitirAposCooldown } from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import { STATUS_FISCAL_AGUARDANDO_SEFAZ } from '../rules/vendasKanban.rules'
import {
  aplicarPatchFiscalKanbanSemRefetch,
  extrairPatchFiscalKanban,
  sincronizarStatusFiscalVendaKanban,
} from '../utils/kanbanVendaCacheUpdate'
import type { Venda } from '../types'

export type AcaoFiscalKanbanEmAndamento = 'emitindo' | 'reemitindo'

/** Tempo mínimo com o botão em loading (evita flash invisível). */
const MIN_LOADING_MS = 900
/** Polling enquanto o botão está em loading. */
const POLL_STATUS_TENTATIVAS = 8
const POLL_STATUS_INTERVALO_MS = 2000
/** Continua sincronizando em background após o loading (várias notas em paralelo). */
const BACKGROUND_SYNC_TENTATIVAS = 20
const BACKGROUND_SYNC_INTERVALO_MS = 3000
/** Evita sobrecarga na SEFAZ/API ao clicar vários cards. */
const MAX_REEMISSOES_CONCORRENTES = 2

/** Lock síncrono por venda — evita duplo clique antes do re-render do React. */
export function createEmissaoFiscalKanbanLock() {
  const ids = new Set<string>()
  return {
    tryAcquire(vendaId: string): boolean {
      if (ids.has(vendaId)) return false
      ids.add(vendaId)
      return true
    },
    release(vendaId: string): void {
      ids.delete(vendaId)
    },
    isLocked(vendaId: string): boolean {
      return ids.has(vendaId)
    },
  }
}

/** Fila global de reemissão/emissão (compartilhada entre cliques). */
function createConcurrencyQueue(maxConcurrent: number) {
  let active = 0
  const waiting: Array<() => void> = []

  return function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        active += 1
        fn()
          .then(resolve, reject)
          .finally(() => {
            active -= 1
            const next = waiting.shift()
            if (next) next()
          })
      }
      if (active < maxConcurrent) run()
      else waiting.push(run)
    })
  }
}

const enqueueReemissaoFiscal = createConcurrencyQueue(MAX_REEMISSOES_CONCORRENTES)

function normalizarStatusFiscal(status: string | null | undefined): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
}

function statusFiscalAguardando(status: string | null | undefined): boolean {
  const s = normalizarStatusFiscal(status)
  return STATUS_FISCAL_AGUARDANDO_SEFAZ.has(s)
}

/**
 * Decide se o poll pode encerrar com o status atual.
 * Não para em REJEITADA “velha” (mesmo status de antes sem ter visto PENDENTE) —
 * isso fazia o card ficar rejeitado com nota já autorizada.
 */
export function deveEncerrarPollComStatus(
  status: string | null | undefined,
  statusAnterior: string,
  viuAguardando: boolean
): boolean {
  const s = normalizarStatusFiscal(status)
  if (!s) return false
  if (s === 'EMITIDA' || s === 'CANCELADA' || s === 'INUTILIZADA') return true
  if ((s === 'REJEITADA' || s === 'DENEGADA') && viuAguardando) return true
  if ((s === 'REJEITADA' || s === 'DENEGADA') && s !== statusAnterior) return true
  return false
}

export interface VendaSelecionadaParaEmissao {
  id: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  numeroVenda?: number
  codigoVenda?: string
  origemVenda?: string
  clienteId?: string | null
  clienteNome?: string | null
  tipoVenda?: string | null
}

interface UseFiscalEmissaoKanbanParams {
  reemitirNfePdv: (payload: { id: string; documentId: string; numero?: number }) => Promise<unknown>
  reemitirNfeGestor: (payload: {
    id: string
    documentId: string
    numero?: number
  }) => Promise<unknown>
  emitirNotaPdv: (payload: { id: string; modelo: 55 | 65 }) => Promise<unknown>
  emitirNotaGestor: (payload: { id: string; modelo: 55 | 65 }) => Promise<unknown>
  emitirNotaDelivery: (payload: { id: string; modelo: 55 | 65 }) => Promise<unknown>
  setPrimeiroPorColuna: Dispatch<SetStateAction<Record<string, string>>>
  setVendaSelecionadaParaEmissao: Dispatch<SetStateAction<VendaSelecionadaParaEmissao | null>>
  setSelectedVendaId: Dispatch<SetStateAction<string | null>>
  setEmitirNfeModalOpen: Dispatch<SetStateAction<boolean>>
}

export function useFiscalEmissaoKanban(params: UseFiscalEmissaoKanbanParams) {
  const {
    reemitirNfePdv,
    reemitirNfeGestor,
    emitirNotaPdv,
    emitirNotaGestor,
    emitirNotaDelivery,
    setPrimeiroPorColuna,
    setVendaSelecionadaParaEmissao,
    setSelectedVendaId,
    setEmitirNfeModalOpen,
  } = params
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const [acaoFiscalEmAndamentoPorVenda, setAcaoFiscalEmAndamentoPorVenda] = useState<
    Record<string, AcaoFiscalKanbanEmAndamento>
  >({})
  const emissaoFiscalLockRef = useRef<ReturnType<typeof createEmissaoFiscalKanbanLock> | null>(
    null
  )
  if (!emissaoFiscalLockRef.current) {
    emissaoFiscalLockRef.current = createEmissaoFiscalKanbanLock()
  }
  const emissaoFiscalLock = emissaoFiscalLockRef.current
  const backgroundSyncIdsRef = useRef(new Set<string>())

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const setAcaoFiscalEmAndamento = useCallback(
    (vendaId: string, acao: AcaoFiscalKanbanEmAndamento | null) => {
      setAcaoFiscalEmAndamentoPorVenda(prev => {
        if (!acao) {
          const { [vendaId]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [vendaId]: acao }
      })
    },
    []
  )

  const iniciarAcaoFiscal = useCallback(
    (vendaId: string, acao: AcaoFiscalKanbanEmAndamento): boolean => {
      if (!emissaoFiscalLock.tryAcquire(vendaId)) return false
      flushSync(() => {
        setAcaoFiscalEmAndamento(vendaId, acao)
      })
      return true
    },
    [emissaoFiscalLock, setAcaoFiscalEmAndamento]
  )

  const encerrarAcaoFiscal = useCallback(
    (vendaId: string) => {
      emissaoFiscalLock.release(vendaId)
      setAcaoFiscalEmAndamento(vendaId, null)
    },
    [emissaoFiscalLock, setAcaoFiscalEmAndamento]
  )

  const getEtapaKanbanParaExibicao = useCallback((v: Venda): string => v.getEtapaKanban(), [])

  const emitirNotaParaVenda = useCallback(
    async (venda: Venda, modelo: 55 | 65) => {
      if (deveUsarModuloDeliveryParaEmissaoFiscal(venda.tabelaOrigem, venda.tipoVenda)) {
        return emitirNotaDelivery({ id: venda.id, modelo })
      }
      if (venda.tabelaOrigem === 'venda_gestor') {
        return emitirNotaGestor({ id: venda.id, modelo })
      }
      return emitirNotaPdv({ id: venda.id, modelo })
    },
    [emitirNotaDelivery, emitirNotaGestor, emitirNotaPdv]
  )

  const pollStatusFiscalAteResolver = useCallback(
    async (
      venda: Venda,
      statusAnteriorRaw: Venda['statusFiscal'],
      tentativas: number,
      intervaloMs: number
    ): Promise<boolean> => {
      const token = auth?.getAccessToken()
      if (!token) return false

      const statusAnterior = normalizarStatusFiscal(statusAnteriorRaw)
      let viuAguardando = false

      for (let i = 0; i < tentativas; i++) {
        await sleep(intervaloMs)
        const patch = await sincronizarStatusFiscalVendaKanban(queryClient, venda, token, {
          atualizarCache: false,
          moverColuna: false,
        })
        const status = patch?.statusFiscal
        if (!status) continue

        if (statusFiscalAguardando(status)) {
          viuAguardando = true
          continue
        }

        if (deveEncerrarPollComStatus(status, statusAnterior, viuAguardando)) {
          aplicarPatchFiscalKanbanSemRefetch(queryClient, venda.id, {
            ...patch,
            etapaKanbanBalcao:
              normalizarStatusFiscal(status) === 'REJEITADA' ||
              normalizarStatusFiscal(status) === 'DENEGADA'
                ? 'REJEITADAS'
                : 'COM_NFE',
          })
          return true
        }
      }

      return false
    },
    [auth, queryClient]
  )

  /** Continua buscando status após o loading do botão (várias notas / SEFAZ lenta). */
  const iniciarSyncBackgroundStatusFiscal = useCallback(
    (venda: Venda, statusAnterior: Venda['statusFiscal']) => {
      if (backgroundSyncIdsRef.current.has(venda.id)) return
      backgroundSyncIdsRef.current.add(venda.id)

      void (async () => {
        try {
          await pollStatusFiscalAteResolver(
            venda,
            statusAnterior,
            BACKGROUND_SYNC_TENTATIVAS,
            BACKGROUND_SYNC_INTERVALO_MS
          )
        } finally {
          backgroundSyncIdsRef.current.delete(venda.id)
        }
      })()
    },
    [pollStatusFiscalAteResolver]
  )

  const executarAcaoFiscalComLock = useCallback(
    async (
      venda: Venda,
      acao: AcaoFiscalKanbanEmAndamento,
      statusAnterior: Venda['statusFiscal'],
      executar: () => Promise<unknown>
    ) => {
      if (!iniciarAcaoFiscal(venda.id, acao)) return

      const iniciadoEm = Date.now()
      let precisaSyncBackground = false

      try {
        const resultado = await enqueueReemissaoFiscal(executar)
        const patchResposta = extrairPatchFiscalKanban(resultado)
        const statusResposta = normalizarStatusFiscal(patchResposta.statusFiscal)
        const anterior = normalizarStatusFiscal(statusAnterior)

        // Backend persiste EMITINDO e move para COM_NFE — UI usa statusFiscal, não flag local.
        const statusParaCache =
          statusResposta || (acao === 'emitindo' || acao === 'reemitindo' ? 'EMITINDO' : '')
        if (statusParaCache && !deveEncerrarPollComStatus(statusParaCache, anterior, false)) {
          aplicarPatchFiscalKanbanSemRefetch(queryClient, venda.id, {
            ...patchResposta,
            statusFiscal: statusParaCache,
            etapaKanbanBalcao:
              statusParaCache === 'REJEITADA' || statusParaCache === 'DENEGADA'
                ? 'REJEITADAS'
                : 'COM_NFE',
          })
        }

        if (deveEncerrarPollComStatus(statusResposta, anterior, false)) {
          aplicarPatchFiscalKanbanSemRefetch(queryClient, venda.id, {
            ...patchResposta,
            etapaKanbanBalcao:
              statusResposta === 'REJEITADA' || statusResposta === 'DENEGADA'
                ? 'REJEITADAS'
                : statusResposta === 'EMITIDA' ||
                    statusResposta === 'CANCELADA' ||
                    statusResposta === 'INUTILIZADA'
                  ? 'COM_NFE'
                  : patchResposta.etapaKanbanBalcao,
          })
        } else {
          const resolvido = await pollStatusFiscalAteResolver(
            venda,
            statusAnterior,
            POLL_STATUS_TENTATIVAS,
            POLL_STATUS_INTERVALO_MS
          )
          if (!resolvido) {
            precisaSyncBackground = true
          }
        }
      } catch (error) {
        console.error(
          acao === 'reemitindo' ? 'Erro ao tentar reemitir:' : 'Erro ao emitir nota fiscal:',
          error
        )
      } finally {
        const decorrido = Date.now() - iniciadoEm
        if (decorrido < MIN_LOADING_MS) {
          await sleep(MIN_LOADING_MS - decorrido)
        }
        encerrarAcaoFiscal(venda.id)
        if (precisaSyncBackground) {
          iniciarSyncBackgroundStatusFiscal(venda, statusAnterior)
        }
      }
    },
    [
      encerrarAcaoFiscal,
      iniciarAcaoFiscal,
      iniciarSyncBackgroundStatusFiscal,
      pollStatusFiscalAteResolver,
      queryClient,
    ]
  )

  const handleEmitirNfe = useCallback(
    async (venda: Venda) => {
      if (emissaoFiscalLock.isLocked(venda.id)) return

      const numeroNotaRejeitada =
        venda.numeroFiscal != null && Number.isFinite(Number(venda.numeroFiscal))
          ? Number(venda.numeroFiscal)
          : undefined

      const podeReemitirInterativo =
        venda.statusFiscal === 'REJEITADA' ||
        venda.statusFiscal === 'DENEGADA' ||
        fiscalPendentePodeReemitirAposCooldown({
          statusFiscal: venda.statusFiscal,
          retornoSefaz: venda.retornoSefaz,
          documentoFiscalId: venda.documentoFiscalId,
          numeroFiscal: venda.numeroFiscal,
          dataUltimaModificacao: venda.dataUltimaModificacao,
          dataEmissaoFiscal: venda.dataEmissaoFiscal,
          dataFinalizacao: venda.dataFinalizacao,
          dataCriacao: venda.dataCriacao,
        })

      if (podeReemitirInterativo) {
        const docId = venda.documentoFiscalId?.trim()
        if (docId) {
          const payload = {
            id: venda.id,
            documentId: docId,
            ...(numeroNotaRejeitada != null ? { numero: numeroNotaRejeitada } : {}),
          }
          const usarDelivery = deveUsarModuloDeliveryParaEmissaoFiscal(
            venda.tabelaOrigem,
            venda.tipoVenda
          )
          const modeloReemitir = resolveModeloParaEmitirNota(venda)
          await executarAcaoFiscalComLock(
            venda,
            'reemitindo',
            venda.statusFiscal,
            async () => {
              if (usarDelivery && modeloReemitir !== null) {
                return emitirNotaDelivery({ id: venda.id, modelo: modeloReemitir })
              }
              if (venda.tabelaOrigem === 'venda_gestor') {
                return reemitirNfeGestor(payload)
              }
              return reemitirNfePdv(payload)
            }
          )
          return
        }

        const modeloEmitir = resolveModeloParaEmitirNota(venda)
        if (modeloEmitir !== null) {
          if (modeloEmitir === 55 && !venda.cliente?.id?.trim()) {
            showToast.error(
              'Para emitir NF-e (modelo 55) é obrigatório que a venda tenha um cliente cadastrado. Vincule o cliente na origem do pedido e tente novamente.'
            )
            return
          }
          await executarAcaoFiscalComLock(venda, 'emitindo', venda.statusFiscal, () =>
            emitirNotaParaVenda(venda, modeloEmitir)
          )
          return
        }
      }

      setPrimeiroPorColuna(prev => ({ ...prev, COM_NFE: venda.id }))
      setVendaSelecionadaParaEmissao({
        id: venda.id,
        tabelaOrigem: venda.tabelaOrigem,
        numeroVenda: venda.numeroVenda,
        codigoVenda: venda.codigoVenda,
        origemVenda: venda.origem,
        clienteId: venda.cliente?.id ?? null,
        clienteNome: venda.cliente?.nome ?? null,
        tipoVenda: venda.tipoVenda,
      })
      setSelectedVendaId(venda.id)
      setEmitirNfeModalOpen(true)
    },
    [
      emissaoFiscalLock,
      emitirNotaDelivery,
      emitirNotaParaVenda,
      executarAcaoFiscalComLock,
      reemitirNfeGestor,
      reemitirNfePdv,
      setEmitirNfeModalOpen,
      setPrimeiroPorColuna,
      setSelectedVendaId,
      setVendaSelecionadaParaEmissao,
    ]
  )

  return {
    acaoFiscalEmAndamentoPorVenda,
    getEtapaKanbanParaExibicao,
    handleEmitirNfe,
  }
}
