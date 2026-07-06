'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  COLUNAS_ENTREGA_OPERACIONAIS,
  dataOrdenacaoCardKanban,
  ordenarVendasKanbanPorCriterio,
} from '../rules/vendasKanban.rules'
import { flattenPedidosDeliveryInfinite } from './usePedidosDeliveryInfinite'
import { flattenVendasUnificadasInfinite } from './useVendasUnificadas'
import {
  DELIVERY_KANBAN_COLUMN_IDS,
  isColunaKanbanDeliveryFiscalSplit,
  vendaPertenceColunaDeliveryKanban,
} from '../utils/kanbanDeliveryColumnConfig'
import { BALCAO_KANBAN_COLUMN_IDS } from '../utils/kanbanBalcaoColumnConfig'
import { cloneVendaUnificadaDTO } from '../utils/kanbanVendaCacheUpdate'
import { filtrarVendaDeliveryKanbanColunaPorDatasToolbar } from '../utils/kanbanVendasListagem'
import type {
  ColunaKanbanId,
  CriterioOrdenacaoKanban,
  DirecaoOrdenacaoKanban,
  Venda,
} from '../types'
import type { usePedidosDeliveryKanbanColumns } from './usePedidosDeliveryKanbanColumns'
import type { useVendasUnificadasKanbanColumns } from './useVendasUnificadasKanbanColumns'

type DeliveryKanbanReturn = ReturnType<typeof usePedidosDeliveryKanbanColumns>
type BalcaoKanbanReturn = ReturnType<typeof useVendasUnificadasKanbanColumns>

export interface VendasUnificadasQueryParams {
  dataCriacaoInicial?: string
  dataCriacaoFinal?: string
  dataFinalizacaoInicio?: string
  dataFinalizacaoFim?: string
  [key: string]: unknown
}

export interface UseKanbanVendasPorColunaParams {
  isModoDeliveryKanban: boolean
  todasVendasCarregadas: Venda[]
  deliveryKanban: DeliveryKanbanReturn
  balcaoKanban: BalcaoKanbanReturn
  deliveryColumnCounts: Record<string, number>
  getEtapaKanbanParaExibicao: (venda: Venda) => string
  etapaLocalPorVendaId: Record<string, ColunaKanbanId>
  timestampsEtapaEntregaLocal: Record<string, string>
  deltaContagemColunasTransicao: Partial<Record<ColunaKanbanId, number>>
  primeiroPorColuna: Record<string, string>
  setPrimeiroPorColuna: React.Dispatch<React.SetStateAction<Record<string, string>>>
  vendasUnificadasQueryParams: VendasUnificadasQueryParams
}

const CRITERIO_PADRAO: Record<ColunaKanbanId, CriterioOrdenacaoKanban> = {
  NOVOS_PEDIDOS: 'data',
  EM_PREPARO: 'data',
  PRONTO_ENTREGA: 'data',
  EM_ROTA: 'data',
  FINALIZADAS: 'data',
  PENDENTE_EMISSAO: 'data',
  COM_NFE: 'data',
}

const DIRECAO_PADRAO: Record<ColunaKanbanId, DirecaoOrdenacaoKanban> = {
  NOVOS_PEDIDOS: 'desc',
  EM_PREPARO: 'desc',
  PRONTO_ENTREGA: 'desc',
  EM_ROTA: 'desc',
  FINALIZADAS: 'desc',
  PENDENTE_EMISSAO: 'desc',
  COM_NFE: 'desc',
}

export function useKanbanVendasPorColuna({
  isModoDeliveryKanban,
  todasVendasCarregadas,
  deliveryKanban,
  balcaoKanban,
  deliveryColumnCounts,
  getEtapaKanbanParaExibicao,
  etapaLocalPorVendaId,
  timestampsEtapaEntregaLocal,
  deltaContagemColunasTransicao,
  primeiroPorColuna,
  setPrimeiroPorColuna,
  vendasUnificadasQueryParams,
}: UseKanbanVendasPorColunaParams) {
  const [criterioOrdenacaoPorColuna, setCriterioOrdenacaoPorColuna] =
    useState<Record<ColunaKanbanId, CriterioOrdenacaoKanban>>(CRITERIO_PADRAO)

  const [direcaoOrdenacaoPorColuna, setDirecaoOrdenacaoPorColuna] =
    useState<Record<ColunaKanbanId, DirecaoOrdenacaoKanban>>(DIRECAO_PADRAO)

  const todasVendas = useMemo(() => {
    return todasVendasCarregadas
  }, [todasVendasCarregadas])

  const vendasPorColuna = useMemo(() => {
    const ordenarColuna = (columnId: string, vendas: Venda[]): Venda[] => {
      const vendasUnicas = new Map<string, Venda>()
      vendas.forEach(venda => {
        if (!vendasUnicas.has(venda.id)) {
          vendasUnicas.set(venda.id, venda)
        }
      })

      const colId = columnId as ColunaKanbanId
      const criterio = criterioOrdenacaoPorColuna[colId] ?? ('data' as CriterioOrdenacaoKanban)
      const direcao = direcaoOrdenacaoPorColuna[colId] ?? ('desc' as DirecaoOrdenacaoKanban)
      let ordenadas = ordenarVendasKanbanPorCriterio(
        Array.from(vendasUnicas.values()),
        criterio,
        direcao,
        v => dataOrdenacaoCardKanban(colId, v, timestampsEtapaEntregaLocal[v.id])
      )

      const pinId = primeiroPorColuna[columnId]
      if (pinId) {
        const idx = ordenadas.findIndex(v => v.id === pinId)
        if (idx > 0) {
          const [pinned] = ordenadas.splice(idx, 1)
          ordenadas = [pinned, ...ordenadas]
        }
      }

      const idsEmTransicao = new Set(
        ordenadas.filter(v => etapaLocalPorVendaId[v.id] === colId).map(v => v.id)
      )
      if (idsEmTransicao.size > 0) {
        const emTransicao = ordenadas.filter(v => idsEmTransicao.has(v.id))
        const resto = ordenadas.filter(v => !idsEmTransicao.has(v.id))
        ordenadas = [...emTransicao, ...resto]
      }

      return ordenadas
    }

    if (isModoDeliveryKanban) {
      const map: Partial<Record<ColunaKanbanId, Venda[]>> = {}
      for (const columnId of DELIVERY_KANBAN_COLUMN_IDS) {
        const state = deliveryKanban.columnStates[columnId]
        const { items } = flattenPedidosDeliveryInfinite(state?.data)
        let vendas = items.filter(v => {
          if (
            isColunaKanbanDeliveryFiscalSplit(columnId) &&
            !vendaPertenceColunaDeliveryKanban(v, columnId, getEtapaKanbanParaExibicao)
          ) {
            return false
          }
          const etapaLocal = etapaLocalPorVendaId[v.id]
          if (etapaLocal && etapaLocal !== columnId) {
            return false
          }
          return filtrarVendaDeliveryKanbanColunaPorDatasToolbar(
            v,
            columnId,
            vendasUnificadasQueryParams
          )
        })

        if (!isColunaKanbanDeliveryFiscalSplit(columnId)) {
          for (const [vendaId, colunaDestino] of Object.entries(etapaLocalPorVendaId)) {
            if (colunaDestino !== columnId) continue
            if (vendas.some(v => v.id === vendaId)) continue
            const vendaTransicao = todasVendasCarregadas.find(v => v.id === vendaId)
            if (
              vendaTransicao &&
              filtrarVendaDeliveryKanbanColunaPorDatasToolbar(
                vendaTransicao,
                columnId,
                vendasUnificadasQueryParams
              )
            ) {
              vendas = [...vendas, vendaTransicao]
            }
          }
        }

        map[columnId] = ordenarColuna(columnId, vendas)
      }
      return map
    }

    const map: Partial<Record<ColunaKanbanId, Venda[]>> = {}
    for (const columnId of BALCAO_KANBAN_COLUMN_IDS) {
      const state = balcaoKanban.columnStates[columnId]
      const { items } = flattenVendasUnificadasInfinite(state?.data)
      // Balcão: API já filtra por colunaKanban — não reclassificar nem refiltrar datas no client.
      let vendas = items.filter(v => {
        const etapaLocal = etapaLocalPorVendaId[v.id]
        if (etapaLocal && etapaLocal !== columnId) {
          return false
        }
        return true
      })

      for (const [vendaId, colunaDestino] of Object.entries(etapaLocalPorVendaId)) {
        if (colunaDestino !== columnId) continue
        if (vendas.some(v => v.id === vendaId)) continue
        const vendaTransicao = todasVendasCarregadas.find(v => v.id === vendaId)
        if (vendaTransicao) {
          const patch =
            colunaDestino === 'PENDENTE_EMISSAO'
              ? { etapaKanbanBalcao: 'PENDENTE_EMISSAO' as const, solicitarEmissaoFiscal: true }
              : colunaDestino === 'FINALIZADAS'
                ? { etapaKanbanBalcao: 'FINALIZADAS' as const, solicitarEmissaoFiscal: false }
                : { etapaKanbanBalcao: colunaDestino }
          vendas = [...vendas, cloneVendaUnificadaDTO(vendaTransicao, patch)]
        }
      }

      map[columnId] = ordenarColuna(columnId, vendas)
    }
    return map
  }, [
    isModoDeliveryKanban,
    deliveryKanban.columnStates,
    balcaoKanban.columnStates,
    getEtapaKanbanParaExibicao,
    etapaLocalPorVendaId,
    timestampsEtapaEntregaLocal,
    todasVendasCarregadas,
    criterioOrdenacaoPorColuna,
    direcaoOrdenacaoPorColuna,
    primeiroPorColuna,
    vendasUnificadasQueryParams,
  ])

  const getColumnTotalCount = useCallback(
    (columnId: ColunaKanbanId): number => {
      if (isModoDeliveryKanban) {
        const isOperacional = COLUNAS_ENTREGA_OPERACIONAIS.includes(columnId)
        const colState = deliveryKanban.columnStates[columnId]

        if (isOperacional && colState && !colState.hasNextPage) {
          return vendasPorColuna[columnId]?.length ?? 0
        }

        const base =
          deliveryColumnCounts[columnId] ??
          (typeof colState?.totalCount === 'number' ? colState.totalCount : 0)

        if (isOperacional) {
          return Math.max(0, base + (deltaContagemColunasTransicao[columnId] ?? 0))
        }
        return base
      }

      const colState = balcaoKanban.columnStates[columnId as keyof typeof balcaoKanban.columnStates]
      return typeof colState?.totalCount === 'number' ? colState.totalCount : 0
    },
    [
      isModoDeliveryKanban,
      deliveryColumnCounts,
      deliveryKanban.columnStates,
      balcaoKanban.columnStates,
      deltaContagemColunasTransicao,
      vendasPorColuna,
    ]
  )

  const limparPinColuna = useCallback(
    (columnId: string) => {
      setPrimeiroPorColuna(prev => {
        if (!prev[columnId]) return prev
        const next = { ...prev }
        delete next[columnId]
        return next
      })
    },
    [setPrimeiroPorColuna]
  )

  return {
    todasVendas,
    vendasPorColuna,
    getColumnTotalCount,
    criterioOrdenacaoPorColuna,
    setCriterioOrdenacaoPorColuna,
    direcaoOrdenacaoPorColuna,
    setDirecaoOrdenacaoPorColuna,
    limparPinColuna,
  }
}
