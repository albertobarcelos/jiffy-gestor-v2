'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { hidratarEntregadoresKanbanDesdeSummary } from '../../delivery/kanban-panels/entregadorKanbanStore'
import { COLUNAS_ENTREGA_OPERACIONAIS } from '../rules/vendasKanban.rules'
import type { ColunaKanbanId, Venda } from '../types'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'

export interface UseKanbanEntregadorSyncParams {
  modoKanbanVendas: ModoKanbanVendas
  isLoadingDelivery: boolean
  todasVendasCarregadas: Venda[]
  getEtapaKanbanParaExibicao: (venda: Venda) => string
  entregadorPorVendaIdRef?: React.MutableRefObject<Record<string, string>>
}

export function useKanbanEntregadorSync({
  modoKanbanVendas,
  isLoadingDelivery,
  todasVendasCarregadas,
  getEtapaKanbanParaExibicao,
  entregadorPorVendaIdRef,
}: UseKanbanEntregadorSyncParams) {
  const [entregadorPorVendaId, setEntregadorPorVendaId] = useState<Record<string, string>>({})

  if (entregadorPorVendaIdRef) {
    entregadorPorVendaIdRef.current = entregadorPorVendaId
  }

  const entregadoresSummaryKey = useMemo(
    () =>
      todasVendasCarregadas
        .filter(
          v =>
            v.isPedidoEntregaGestor() &&
            String(v.tipoVenda ?? '').trim().toLowerCase() === 'entrega'
        )
        .filter(v =>
          COLUNAS_ENTREGA_OPERACIONAIS.includes(
            getEtapaKanbanParaExibicao(v) as ColunaKanbanId
          )
        )
        .map(v => `${v.id}:${v.entregador?.id ?? 'null'}`)
        .sort()
        .join('|'),
    [todasVendasCarregadas, getEtapaKanbanParaExibicao]
  )

  /** Entregador vem do summary da listagem — sem GET em lote por card. */
  useEffect(() => {
    if (modoKanbanVendas !== 'delivery') return
    if (isLoadingDelivery) return
    if (!entregadoresSummaryKey) return

    const vendasRef = todasVendasCarregadas
      .filter(
        v =>
          v.isPedidoEntregaGestor() &&
          String(v.tipoVenda ?? '').trim().toLowerCase() === 'entrega' &&
          COLUNAS_ENTREGA_OPERACIONAIS.includes(
            getEtapaKanbanParaExibicao(v) as ColunaKanbanId
          )
      )
      .map(v => ({
        id: v.id,
        tabelaOrigem:
          v.tabelaOrigem === 'venda_gestor' ? ('venda_gestor' as const) : ('venda' as const),
        tipoVenda: v.tipoVenda,
        entregador: v.entregador,
      }))

    const updatesSummary = hidratarEntregadoresKanbanDesdeSummary(vendasRef)
    if (Object.keys(updatesSummary).length === 0) return

    setEntregadorPorVendaId(prev => {
      const next = { ...prev }
      let changed = false
      for (const [vendaId, entregadorId] of Object.entries(updatesSummary)) {
        if (next[vendaId] !== entregadorId) {
          next[vendaId] = entregadorId
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [
    modoKanbanVendas,
    isLoadingDelivery,
    entregadoresSummaryKey,
    todasVendasCarregadas,
    getEtapaKanbanParaExibicao,
  ])

  const handleEntregadorAtualizado = useCallback(
    (vendaId: string, entregadorId: string | null) => {
      setEntregadorPorVendaId(prev => {
        if (!entregadorId) {
          const { [vendaId]: _removido, ...resto } = prev
          return resto
        }
        return { ...prev, [vendaId]: entregadorId }
      })
    },
    []
  )

  const patchEntregadorPorVendaId = useCallback((vendaId: string, entregadorId: string) => {
    setEntregadorPorVendaId(prev => ({
      ...prev,
      [vendaId]: entregadorId,
    }))
  }, [])

  return {
    entregadorPorVendaId,
    setEntregadorPorVendaId,
    handleEntregadorAtualizado,
    patchEntregadorPorVendaId,
  }
}
