import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { resolveModeloParaEmitirNota } from './useVendasUnificadas'
import { deveUsarModuloDeliveryParaEmissaoFiscal } from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'
import { fiscalPendentePodeReemitirAposCooldown } from '@/src/domain/services/pedido/RegrasFiscaisVenda'
import { STATUS_FISCAL_AGUARDANDO_SEFAZ } from '../rules/fiscalFlowKanban.rules'
import type { Venda } from '../types'

export type AcaoFiscalKanbanEmAndamento = 'emitindo' | 'reemitindo'

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

function statusFiscalAtualizadoAposEmissao(
  statusAnterior: Venda['statusFiscal'],
  statusAtual: Venda['statusFiscal']
): boolean {
  const anterior = String(statusAnterior ?? '')
    .trim()
    .toUpperCase()
  const atual = String(statusAtual ?? '')
    .trim()
    .toUpperCase()
  if (atual !== anterior) return true
  return STATUS_FISCAL_AGUARDANDO_SEFAZ.has(atual)
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
  refetch: () => Promise<{ data?: { items?: Venda[] } } | unknown>
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
    refetch,
    setPrimeiroPorColuna,
    setVendaSelecionadaParaEmissao,
    setSelectedVendaId,
    setEmitirNfeModalOpen,
  } = params
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
      setAcaoFiscalEmAndamento(vendaId, acao)
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

  /**
   * Etapa do card no Kanban. Durante reemissão ("Reemitindo...") ou emissão direta ("Emitindo..."),
   * exibe em Com nota solicitada; ao concluir, volta a usar `getEtapaKanban()`.
   */
  const getEtapaKanbanParaExibicao = useCallback(
    (v: Venda): string => {
      const acao = acaoFiscalEmAndamentoPorVenda[v.id]
      if (acao === 'reemitindo' || acao === 'emitindo') {
        return 'COM_NFE'
      }
      return v.getEtapaKanban()
    },
    [acaoFiscalEmAndamentoPorVenda]
  )

  const refetchAteMudarStatusFiscal = useCallback(
    async (
      vendaId: string,
      statusAnterior: Venda['statusFiscal'],
      tentativasMaximas = 6,
      intervaloMs = 2000
    ) => {
      for (let tentativa = 0; tentativa < tentativasMaximas; tentativa++) {
        const result = (await refetch()) as { data?: { items?: Venda[] } }
        const vendaAtualizada = result.data?.items?.find((item: Venda) => item.id === vendaId)
        if (!vendaAtualizada) return

        if (statusFiscalAtualizadoAposEmissao(statusAnterior, vendaAtualizada.statusFiscal)) {
          return
        }

        await sleep(intervaloMs)
      }
    },
    [refetch]
  )

  /**
   * Mesma regra do drag ao soltar em "Com nota solicitada": o card fica primeiro na coluna COM_NFE (localStorage).
   * Usado ao clicar Emitir/Reemitir na coluna Pendente emissão (sem arrastar).
   */
  const pinVendaComoPrimeiraEmComNotaSolicitada = useCallback(
    (venda: Venda) => {
      if (getEtapaKanbanParaExibicao(venda) !== 'PENDENTE_EMISSAO') return
      const origemKanban = venda.getEtapaKanban()
      setPrimeiroPorColuna(prev => {
        const next = { ...prev }
        if (
          (origemKanban === 'FINALIZADAS' || origemKanban === 'PENDENTE_EMISSAO') &&
          prev[origemKanban] === venda.id
        ) {
          delete next[origemKanban]
        }
        next.COM_NFE = venda.id
        return next
      })
    },
    [getEtapaKanbanParaExibicao, setPrimeiroPorColuna]
  )

  const emitirNotaParaVenda = useCallback(
    async (venda: Venda, modelo: 55 | 65) => {
      if (deveUsarModuloDeliveryParaEmissaoFiscal(venda.tabelaOrigem, venda.tipoVenda)) {
        await emitirNotaDelivery({ id: venda.id, modelo })
        return
      }
      if (venda.tabelaOrigem === 'venda_gestor') {
        await emitirNotaGestor({ id: venda.id, modelo })
        return
      }
      await emitirNotaPdv({ id: venda.id, modelo })
    },
    [emitirNotaDelivery, emitirNotaGestor, emitirNotaPdv]
  )

  const executarAcaoFiscalComLock = useCallback(
    async (
      venda: Venda,
      acao: AcaoFiscalKanbanEmAndamento,
      statusAnterior: Venda['statusFiscal'],
      executar: () => Promise<void>,
      mensagemInicio: string
    ) => {
      pinVendaComoPrimeiraEmComNotaSolicitada(venda)
      if (!iniciarAcaoFiscal(venda.id, acao)) return

      showToast.info(mensagemInicio)
      try {
        await executar()
        await refetch()
        await refetchAteMudarStatusFiscal(venda.id, statusAnterior)
      } catch (error) {
        console.error(
          acao === 'reemitindo' ? 'Erro ao tentar reemitir:' : 'Erro ao emitir nota fiscal:',
          error
        )
      } finally {
        encerrarAcaoFiscal(venda.id)
      }
    },
    [
      encerrarAcaoFiscal,
      iniciarAcaoFiscal,
      pinVendaComoPrimeiraEmComNotaSolicitada,
      refetch,
      refetchAteMudarStatusFiscal,
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

      // REJEITADA ou PENDENTE travado (limite de tentativas após cooldown): reemitir ou emitir direto.
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
                await emitirNotaDelivery({ id: venda.id, modelo: modeloReemitir })
                return
              }
              if (venda.tabelaOrigem === 'venda_gestor') {
                await reemitirNfeGestor(payload)
              } else {
                await reemitirNfePdv(payload)
              }
            },
            'Enviando reemissão para a SEFAZ...'
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
          await executarAcaoFiscalComLock(
            venda,
            'emitindo',
            venda.statusFiscal,
            () => emitirNotaParaVenda(venda, modeloEmitir),
            'Enviando emissão para a SEFAZ...'
          )
          return
        }
      }

      pinVendaComoPrimeiraEmComNotaSolicitada(venda)

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
      pinVendaComoPrimeiraEmComNotaSolicitada,
      reemitirNfeGestor,
      reemitirNfePdv,
      setEmitirNfeModalOpen,
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
