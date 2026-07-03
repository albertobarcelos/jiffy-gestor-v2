'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { useEntregadoresQuery } from '@/src/presentation/components/features/pedidos/hooks/data/useEntregadoresQuery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  type VendasUnificadasQueryParams,
} from './useVendasUnificadas'
import {
  flattenPedidosDeliveryInfinite,
  vendasUnificadasQueryParamsParaPedidosDelivery,
} from './usePedidosDeliveryInfinite'
import { usePedidosDeliveryKanbanColumns } from './usePedidosDeliveryKanbanColumns'
import { useVendasUnificadasKanbanColumns } from './useVendasUnificadasKanbanColumns'
import { combinarContagensColunasDeliveryKanban } from '../utils/kanbanDeliveryColumnCounts'
import { DELIVERY_KANBAN_COLUMN_IDS } from '../utils/kanbanDeliveryColumnConfig'
import { BALCAO_KANBAN_COLUMN_IDS } from '../utils/kanbanBalcaoColumnConfig'
import {
  KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS,
  KANBAN_VENDAS_REFETCH_INTERVAL_MS,
} from '../utils/kanbanVendasListagem'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ColunaKanbanId, TipoEntregaFiltro, Venda } from '../types'

type TerminalOpcao = { id: string; nome: string }

export interface VendasUnificadasQueryParamsExtended extends VendasUnificadasQueryParams {
  dataCriacaoInicial?: string
  dataCriacaoFinal?: string
  dataFinalizacaoInicio?: string
  dataFinalizacaoFim?: string
  [key: string]: unknown
}

export interface UseKanbanDataQueriesParams {
  modoKanbanVendas: ModoKanbanVendas
  vendasUnificadasQueryParams: VendasUnificadasQueryParamsExtended
  getEtapaKanbanParaExibicaoRef: React.MutableRefObject<(v: Venda) => string>
  tipoEntregaFilter: TipoEntregaFiltro
  setTipoEntregaFilter: React.Dispatch<React.SetStateAction<TipoEntregaFiltro>>
}

export function useKanbanDataQueries({
  modoKanbanVendas,
  vendasUnificadasQueryParams,
  getEtapaKanbanParaExibicaoRef,
  tipoEntregaFilter,
  setTipoEntregaFilter,
}: UseKanbanDataQueriesParams) {
  const isModoDeliveryKanban = modoKanbanVendas === 'delivery'
  const { auth } = useAuthStore()
  const hasKanbanToken = !!auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()

  const [terminalFilter, setTerminalFilter] = useState('')
  const [terminais, setTerminais] = useState<TerminalOpcao[]>([])
  const [isLoadingTerminais, setIsLoadingTerminais] = useState(false)

  const enviarFiltroCriacaoNaDeliveryApi = Boolean(
    vendasUnificadasQueryParams.dataCriacaoInicial || vendasUnificadasQueryParams.dataCriacaoFinal
  )
  const enviarFiltroFinalizacaoNaDeliveryApi = Boolean(
    vendasUnificadasQueryParams.dataFinalizacaoInicio ||
      vendasUnificadasQueryParams.dataFinalizacaoFim
  )

  const { data: meiosPagamentoInfiniteData } = useMeiosPagamentoInfinite({
    ativo: true,
    limit: 100,
    enabled: isModoDeliveryKanban,
  })

  useEntregadoresQuery({
    enabled: hasKanbanToken && isModoDeliveryKanban,
    token: auth?.getAccessToken(),
  })

  const nomesMeiosPagamentoKanban = useMemo(() => {
    const mapa: Record<string, string> = {}
    const pages = meiosPagamentoInfiniteData?.pages ?? []
    for (const page of pages) {
      for (const meio of page.meiosPagamento) {
        mapa[meio.getId()] = meio.getNome()
      }
    }
    return mapa
  }, [meiosPagamentoInfiniteData])

  const pedidosDeliveryQueryParams = useMemo(
    () => vendasUnificadasQueryParamsParaPedidosDelivery(vendasUnificadasQueryParams),
    [vendasUnificadasQueryParams]
  )

  const balcaoQueryParams = useMemo((): VendasUnificadasQueryParams => {
    const { tipoEntrega: _tipoEntrega, ...rest } = vendasUnificadasQueryParams
    return {
      ...rest,
      terminalId: terminalFilter.trim() || undefined,
    }
  }, [vendasUnificadasQueryParams, terminalFilter])

  const infiniteQueryKey = useMemo(
    () =>
      isModoDeliveryKanban
        ? (['delivery', 'pedidos', 'infinite', empresaId, 'columns'] as const)
        : (['vendas-unificadas', 'infinite', empresaId, 'columns'] as const),
    [isModoDeliveryKanban, empresaId]
  )

  const loadAllTerminais = useCallback(async () => {
    const token = auth?.getAccessToken()
    if (!token) return

    setIsLoadingTerminais(true)
    try {
      const allTerminais: TerminalOpcao[] = []
      let currentOffset = 0
      const limit = 50
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams({
          limit: limit.toString(),
          offset: currentOffset.toString(),
        })

        const response = await fetch(`/api/terminais?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) break

        const data = await response.json()
        const newTerminais = (data.items || []).map((t: Record<string, unknown>) => ({
          id: String(t.id),
          nome: String(t.nome || t.name || t.codigoInterno || 'Sem nome'),
        }))

        allTerminais.push(...newTerminais)
        hasMore = newTerminais.length === limit
        currentOffset += newTerminais.length
      }

      setTerminais(allTerminais)
    } catch (error) {
      console.error('Erro ao carregar terminais:', error)
    } finally {
      setIsLoadingTerminais(false)
    }
  }, [auth])

  useEffect(() => {
    if (isModoDeliveryKanban) return
    void loadAllTerminais()
  }, [isModoDeliveryKanban, loadAllTerminais])

  useEffect(() => {
    if (isModoDeliveryKanban && terminalFilter) {
      setTerminalFilter('')
    }
  }, [isModoDeliveryKanban, terminalFilter])

  useEffect(() => {
    if (!isModoDeliveryKanban && tipoEntregaFilter) {
      setTipoEntregaFilter('')
    }
  }, [isModoDeliveryKanban, tipoEntregaFilter, setTipoEntregaFilter])

  const usaFiltroTerminal = !!terminalFilter.trim() && !isModoDeliveryKanban

  const balcaoKanban = useVendasUnificadasKanbanColumns(balcaoQueryParams, {
    enabled: hasKanbanToken && !isModoDeliveryKanban,
    refetchIntervalMs: !isModoDeliveryKanban ? KANBAN_VENDAS_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: !isModoDeliveryKanban,
    enviarFiltroFinalizacaoNaApi: enviarFiltroFinalizacaoNaDeliveryApi,
  })

  const deliveryKanban = usePedidosDeliveryKanbanColumns(pedidosDeliveryQueryParams, {
    enabled: hasKanbanToken && isModoDeliveryKanban,
    refetchIntervalMs: isModoDeliveryKanban ? KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: isModoDeliveryKanban,
    enviarFiltroCriacaoNaApi: enviarFiltroCriacaoNaDeliveryApi,
    enviarFiltroFinalizacaoNaApi: enviarFiltroFinalizacaoNaDeliveryApi,
  })

  const isLoadingDelivery = deliveryKanban.isLoading
  const isLoadingBalcao = balcaoKanban.isLoading
  const refetchDelivery = deliveryKanban.refetch
  const refetchBalcao = balcaoKanban.refetch

  const balcaoKanbanColumnStatesKey = useMemo(
    () => JSON.stringify(balcaoKanban.columnStates),
    [balcaoKanban.columnStates]
  )

  const deliveryKanbanColumnStatesKey = useMemo(
    () => JSON.stringify(deliveryKanban.columnStates),
    [deliveryKanban.columnStates]
  )

  const flattenAllItemsBalcao = balcaoKanban.flattenAllItems
  const flattenAllItemsDelivery = deliveryKanban.flattenAllItems

  const todasVendasFlattened = useMemo(() => {
    if (isModoDeliveryKanban) {
      return flattenAllItemsDelivery()
    }
    return flattenAllItemsBalcao()
  }, [
    isModoDeliveryKanban,
    balcaoKanbanColumnStatesKey,
    deliveryKanbanColumnStatesKey,
    flattenAllItemsBalcao,
    flattenAllItemsDelivery,
  ])

  const todasVendasCarregadas = todasVendasFlattened

  const todasVendasCarregadasRef = useRef(todasVendasCarregadas)
  todasVendasCarregadasRef.current = todasVendasCarregadas

  const isFetchingNextPage = isModoDeliveryKanban
    ? DELIVERY_KANBAN_COLUMN_IDS.some(id => deliveryKanban.columnStates[id]?.isFetchingNextPage)
    : BALCAO_KANBAN_COLUMN_IDS.some(id => balcaoKanban.columnStates[id]?.isFetchingNextPage)

  const fetchNextPagePendenteEmissao = useCallback(() => {
    balcaoKanban.fetchNextPageForColumn('PENDENTE_EMISSAO')
  }, [balcaoKanban.fetchNextPageForColumn])

  const hasNextPagePendenteEmissao =
    balcaoKanban.columnStates.PENDENTE_EMISSAO?.hasNextPage ?? false

  const isLoading = isModoDeliveryKanban ? isLoadingDelivery : isLoadingBalcao

  const refetch = useCallback(async () => {
    if (isModoDeliveryKanban) {
      await refetchDelivery()
      return
    }
    await refetchBalcao()
  }, [isModoDeliveryKanban, refetchDelivery, refetchBalcao])

  const refetchParaEmissaoFiscal = useCallback(async () => {
    if (isModoDeliveryKanban) {
      await refetchDelivery()
      const items = deliveryKanban.flattenAllItems()
      return { data: { items } }
    }
    await refetchBalcao()
    const items = balcaoKanban.flattenAllItems()
    return { data: { items } }
  }, [isModoDeliveryKanban, refetchDelivery, refetchBalcao, deliveryKanban.flattenAllItems, balcaoKanban.flattenAllItems])

  const columnScrollTickingRef = useRef(false)
  const deliveryColumnStatesRef = useRef(deliveryKanban.columnStates)
  deliveryColumnStatesRef.current = deliveryKanban.columnStates
  const balcaoColumnStatesRef = useRef(balcaoKanban.columnStates)
  balcaoColumnStatesRef.current = balcaoKanban.columnStates

  const handleColumnScroll = useCallback(
    (columnId: ColunaKanbanId, event: React.UIEvent<HTMLDivElement>) => {
      const state = isModoDeliveryKanban
        ? deliveryColumnStatesRef.current[columnId]
        : balcaoColumnStatesRef.current[columnId as keyof typeof balcaoColumnStatesRef.current]

      if (!state?.hasNextPage || state.isFetchingNextPage) return
      if (columnScrollTickingRef.current) return

      const el = event.currentTarget
      if (!el) return

      columnScrollTickingRef.current = true
      requestAnimationFrame(() => {
        columnScrollTickingRef.current = false
        const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight
        if (distanciaDoFim <= 120) {
          if (isModoDeliveryKanban) {
            deliveryKanban.fetchNextPageForColumn(columnId)
          } else {
            balcaoKanban.fetchNextPageForColumn(columnId)
          }
        }
      })
    },
    [isModoDeliveryKanban, deliveryKanban.fetchNextPageForColumn, balcaoKanban.fetchNextPageForColumn]
  )

  const deliveryColumnCounts = useMemo((): Record<string, number> => {
    if (!isModoDeliveryKanban) return {}

    const finalizadasState = deliveryKanban.columnStates.FINALIZADAS
    const { items: poolFinalizados } = flattenPedidosDeliveryInfinite(finalizadasState?.data)

    const finalizadoTotal = finalizadasState?.totalCount ?? 0

    return combinarContagensColunasDeliveryKanban(
      undefined,
      finalizadoTotal,
      poolFinalizados,
      v => getEtapaKanbanParaExibicaoRef.current(v),
      finalizadasState?.hasNextPage ?? false,
      deliveryKanban.columnStates
    )
  }, [
    isModoDeliveryKanban,
    deliveryKanbanColumnStatesKey,
    deliveryKanban.columnStates,
    getEtapaKanbanParaExibicaoRef,
  ])

  return {
    isModoDeliveryKanban,
    isLoadingDelivery,
    infiniteQueryKey,
    deliveryKanban,
    balcaoKanban,
    deliveryColumnCounts,
    nomesMeiosPagamentoKanban,
    terminais,
    terminalFilter,
    setTerminalFilter,
    isLoadingTerminais,
    usaFiltroTerminal,
    isLoading,
    isFetchingNextPage,
    todasVendasCarregadas,
    todasVendasCarregadasRef,
    refetch,
    refetchParaEmissaoFiscal,
    handleColumnScroll,
    fetchNextPage: fetchNextPagePendenteEmissao,
    hasNextPage: hasNextPagePendenteEmissao,
  }
}
