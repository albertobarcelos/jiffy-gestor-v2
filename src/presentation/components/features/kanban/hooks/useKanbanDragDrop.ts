'use client'

import { useCallback, useState } from 'react'
import { DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import {
  useMarcarEmissaoFiscal,
  useDesmarcarEmissaoFiscal,
} from '@/src/presentation/hooks/useVendas'
import { showToast } from '@/src/shared/utils/toast'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  COLUNAS_KANBAN_DESTINO_PIN,
  vendaBloqueadaParaEmissaoInterativa,
} from '../rules/vendasKanban.rules'
import { invalidateKanbanVendasListagens } from '../hooks/kanbanListagemQueryCache'
import { moveVendaKanbanBalcaoEntreColunas } from '../utils/kanbanVendaCacheUpdate'
import type { ColunaKanbanId, Venda } from '../types'

export interface UseKanbanDragDropParams {
  getEtapaKanbanParaExibicao: (venda: Venda) => string
  acaoFiscalEmAndamentoPorVenda: Record<string, 'emitindo' | 'reemitindo'>
  setPrimeiroPorColuna: React.Dispatch<React.SetStateAction<Record<string, string>>>
  moverEntregaPorDrag: (venda: Venda, origIdx: number, destIdx: number) => void
  finalizarEntregaPorDrag: (venda: Venda) => void
  handleEmitirNfe: (venda: Venda) => void | Promise<void>
}

export function useKanbanDragDrop({
  getEtapaKanbanParaExibicao,
  acaoFiscalEmAndamentoPorVenda,
  setPrimeiroPorColuna,
  moverEntregaPorDrag,
  finalizarEntregaPorDrag,
  handleEmitirNfe,
}: UseKanbanDragDropParams) {
  const [draggingVenda, setDraggingVenda] = useState<Venda | null>(null)
  const [fiscalTransicaoUi, setFiscalTransicaoUi] = useState<
    Record<string, ColunaKanbanId>
  >({})

  const queryClient = useQueryClient()
  const marcarEmissaoFiscal = useMarcarEmissaoFiscal()
  const desmarcarEmissaoFiscal = useDesmarcarEmissaoFiscal()

  const limparFiscalTransicaoUi = useCallback((vendaId: string) => {
    setFiscalTransicaoUi(prev => {
      if (!(vendaId in prev)) return prev
      const { [vendaId]: _, ...rest } = prev
      return rest
    })
  }, [])

  const reverterTransicaoFiscal = useCallback(
    (vendaId: string) => {
      limparFiscalTransicaoUi(vendaId)
      invalidateKanbanVendasListagens(queryClient)
    },
    [limparFiscalTransicaoUi, queryClient]
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))

  const handleMarcarEmissaoFiscal = useCallback(
    async (venda: Venda) => {
      moveVendaKanbanBalcaoEntreColunas(queryClient, venda.id, 'PENDENTE_EMISSAO', {
        solicitarEmissaoFiscal: true,
      })
      setFiscalTransicaoUi(prev => ({ ...prev, [venda.id]: 'PENDENTE_EMISSAO' }))
      try {
        await marcarEmissaoFiscal.mutateAsync({
          id: venda.id,
          tabelaOrigem: venda.tabelaOrigem,
          kanbanContext: true,
        })
        limparFiscalTransicaoUi(venda.id)
      } catch (error) {
        reverterTransicaoFiscal(venda.id)
        console.error('Erro ao marcar emissão fiscal:', error)
      }
    },
    [marcarEmissaoFiscal, queryClient, limparFiscalTransicaoUi, reverterTransicaoFiscal]
  )

  const handleDesmarcarEmissaoFiscal = useCallback(
    async (venda: Venda) => {
      moveVendaKanbanBalcaoEntreColunas(queryClient, venda.id, 'FINALIZADAS', {
        solicitarEmissaoFiscal: false,
      })
      setFiscalTransicaoUi(prev => ({ ...prev, [venda.id]: 'FINALIZADAS' }))
      try {
        await desmarcarEmissaoFiscal.mutateAsync({
          id: venda.id,
          tabelaOrigem: venda.tabelaOrigem,
          kanbanContext: true,
        })
        limparFiscalTransicaoUi(venda.id)
      } catch (error) {
        reverterTransicaoFiscal(venda.id)
        console.error('Erro ao desmarcar emissão fiscal:', error)
      }
    },
    [desmarcarEmissaoFiscal, queryClient, limparFiscalTransicaoUi, reverterTransicaoFiscal]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const venda = event.active.data.current?.venda as Venda | undefined
    if (venda) setDraggingVenda(venda)
  }, [])

  const handleDragCancel = useCallback(() => {
    setDraggingVenda(null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingVenda(null)
      const { active, over } = event
      if (!over) return
      const venda = active.data.current?.venda as Venda | undefined
      if (!venda) return

      const overIdStr = String(over.id)

      if (COLUNAS_ENTREGA_OPERACIONAIS.includes(overIdStr as ColunaKanbanId)) {
        if (!venda.isPedidoEntregaGestor()) {
          showToast.info('Estas colunas são apenas para pedidos de entrega.')
          return
        }
        const origemEtapa = getEtapaKanbanParaExibicao(venda)
        if (!COLUNAS_ENTREGA_OPERACIONAIS.includes(origemEtapa as ColunaKanbanId)) {
          showToast.info('Arraste apenas pedidos que estão nas etapas de entrega.')
          return
        }
        const origIdx = COLUNAS_ENTREGA_OPERACIONAIS.indexOf(origemEtapa as ColunaKanbanId)
        const destIdx = COLUNAS_ENTREGA_OPERACIONAIS.indexOf(overIdStr as ColunaKanbanId)
        if (origIdx < 0 || destIdx < 0) return
        if (destIdx === origIdx) return
        if (destIdx < origIdx) {
          showToast.info('Não é possível voltar uma etapa arrastando o card.')
          return
        }
        void moverEntregaPorDrag(venda, origIdx, destIdx)
        return
      }

      if (over.id === 'PENDENTE_EMISSAO') {
        if (venda.solicitarEmissaoFiscal !== true) {
          void handleMarcarEmissaoFiscal(venda)
        }
      } else if (over.id === 'FINALIZADAS') {
        const fiscalRejeitada =
          String(venda.statusFiscal ?? '')
            .trim()
            .toUpperCase() === 'REJEITADA'
        if (fiscalRejeitada) {
          showToast.warning(
            'Vendas com nota rejeitada não podem ser movidas para Finalizadas. Use Reemitir na coluna Pendente Emissão.'
          )
          return
        }
        const emRotaGestor =
          venda.isPedidoEntregaGestor() && getEtapaKanbanParaExibicao(venda) === 'EM_ROTA'
        if (emRotaGestor) {
          void finalizarEntregaPorDrag(venda)
        } else if (venda.solicitarEmissaoFiscal === true) {
          void handleDesmarcarEmissaoFiscal(venda)
        }
      } else if (over.id === 'COM_FISCAL') {
        if (venda.getEtapaKanban() !== 'PENDENTE_EMISSAO') {
          showToast.info(
            'Arraste para esta coluna apenas vendas que estão em Pendente emissão fiscal.'
          )
          return
        }
        if (vendaBloqueadaParaEmissaoInterativa(venda, acaoFiscalEmAndamentoPorVenda)) {
          showToast.info(
            'Esta venda não pode ser emitida neste status. Use o botão quando estiver disponível.'
          )
          return
        }
        void handleEmitirNfe(venda)
      }

      const colunaDestino = String(over.id)
      if (COLUNAS_KANBAN_DESTINO_PIN.has(colunaDestino)) {
        const origemKanban = venda.getEtapaKanban()
        setPrimeiroPorColuna(prev => {
          const next = { ...prev }
          if (
            (origemKanban === 'FINALIZADAS' || origemKanban === 'PENDENTE_EMISSAO') &&
            prev[origemKanban] === venda.id
          ) {
            delete next[origemKanban]
          }
          next[colunaDestino] = venda.id
          return next
        })
      }
    },
    [
      getEtapaKanbanParaExibicao,
      moverEntregaPorDrag,
      finalizarEntregaPorDrag,
      handleMarcarEmissaoFiscal,
      handleDesmarcarEmissaoFiscal,
      acaoFiscalEmAndamentoPorVenda,
      handleEmitirNfe,
      setPrimeiroPorColuna,
    ]
  )

  return {
    sensors,
    draggingVenda,
    fiscalTransicaoUi,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  }
}
