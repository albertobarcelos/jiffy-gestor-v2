import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { resolveModeloParaEmitirNota } from '@/src/presentation/hooks/useVendasUnificadas'
import { showToast } from '@/src/shared/utils/toast'
import type { Venda } from './types'

export interface VendaSelecionadaParaEmissao {
  id: string
  tabelaOrigem: 'venda' | 'venda_gestor'
  numeroVenda?: number
  codigoVenda?: string
  origemVenda?: string
  clienteId?: string | null
  clienteNome?: string | null
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
    refetch,
    setPrimeiroPorColuna,
    setVendaSelecionadaParaEmissao,
    setSelectedVendaId,
    setEmitirNfeModalOpen,
  } = params
  const [acaoFiscalEmAndamentoPorVenda, setAcaoFiscalEmAndamentoPorVenda] = useState<
    Record<string, 'emitindo' | 'reemitindo'>
  >({})

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const setAcaoFiscalEmAndamento = useCallback(
    (vendaId: string, acao: 'emitindo' | 'reemitindo' | null) => {
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

        if (vendaAtualizada.statusFiscal !== statusAnterior) {
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

  const handleEmitirNfe = useCallback(
    async (venda: Venda) => {
      const numeroNotaRejeitada =
        venda.numeroFiscal != null && Number.isFinite(Number(venda.numeroFiscal))
          ? Number(venda.numeroFiscal)
          : undefined

      // REJEITADA: com documento → reemitir-nota; sem documento mas com modelo/tipoDoc → emitir-nota direto; sem modelo → modal.
      if (venda.statusFiscal === 'REJEITADA') {
        const docId = venda.documentoFiscalId?.trim()
        if (docId) {
          pinVendaComoPrimeiraEmComNotaSolicitada(venda)

          setAcaoFiscalEmAndamento(venda.id, 'reemitindo')
          try {
            const payload = {
              id: venda.id,
              documentId: docId,
              ...(numeroNotaRejeitada != null ? { numero: numeroNotaRejeitada } : {}),
            }
            if (venda.tabelaOrigem === 'venda_gestor') {
              await reemitirNfeGestor(payload)
            } else {
              await reemitirNfePdv(payload)
            }
            await refetch()
            await refetchAteMudarStatusFiscal(venda.id, 'REJEITADA')
            return
          } catch (error) {
            console.error('Erro ao tentar reemitir:', error)
            return
          } finally {
            setAcaoFiscalEmAndamento(venda.id, null)
          }
        }

        const modeloEmitir = resolveModeloParaEmitirNota(venda)
        if (modeloEmitir !== null) {
          if (modeloEmitir === 55 && !venda.cliente?.id?.trim()) {
            showToast.error(
              'Para emitir NF-e (modelo 55) é obrigatório que a venda tenha um cliente cadastrado. Vincule o cliente na origem do pedido e tente novamente.'
            )
            return
          }
          pinVendaComoPrimeiraEmComNotaSolicitada(venda)
          setAcaoFiscalEmAndamento(venda.id, 'emitindo')
          try {
            if (venda.tabelaOrigem === 'venda_gestor') {
              await emitirNotaGestor({ id: venda.id, modelo: modeloEmitir })
            } else {
              await emitirNotaPdv({ id: venda.id, modelo: modeloEmitir })
            }
            await refetch()
            await refetchAteMudarStatusFiscal(venda.id, 'REJEITADA')
            return
          } catch (error) {
            console.error('Erro ao emitir nota (rejeição sem documento fiscal):', error)
            return
          } finally {
            setAcaoFiscalEmAndamento(venda.id, null)
          }
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
      })
      setSelectedVendaId(venda.id)
      setEmitirNfeModalOpen(true)
    },
    [
      emitirNotaGestor,
      emitirNotaPdv,
      pinVendaComoPrimeiraEmComNotaSolicitada,
      reemitirNfeGestor,
      reemitirNfePdv,
      refetch,
      refetchAteMudarStatusFiscal,
      setAcaoFiscalEmAndamento,
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
