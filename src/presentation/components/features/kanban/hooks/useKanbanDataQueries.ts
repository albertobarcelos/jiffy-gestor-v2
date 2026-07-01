'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMeiosPagamentoInfinite } from '@/src/presentation/hooks/useMeiosPagamento'
import { useVendaIdsPdvPorTerminal } from '@/src/presentation/hooks/useVendaIdsPdvPorTerminal'
import { useEntregadoresQuery } from '@/src/presentation/components/features/pedidos/hooks/data/useEntregadoresQuery'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  flattenVendasUnificadasInfinite,
  useVendasUnificadasInfinite,
  vendasUnificadasInfiniteQueryKey,
} from './useVendasUnificadas'
import {
  flattenPedidosDeliveryInfinite,
  vendasUnificadasQueryParamsParaPedidosDelivery,
} from './usePedidosDeliveryInfinite'
import { usePedidosDeliveryKanbanColumns } from './usePedidosDeliveryKanbanColumns'
import { combinarContagensColunasDeliveryKanban } from '../utils/kanbanDeliveryColumnCounts'
import { DELIVERY_KANBAN_COLUMN_IDS } from '../utils/kanbanDeliveryColumnConfig'
import { useKanbanColumnScrollLoadMore } from './useKanbanColumnScrollLoadMore'
import {
  KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS,
  KANBAN_VENDAS_REFETCH_INTERVAL_MS,
} from '../utils/kanbanVendasListagem'
import type { ModoKanbanVendas } from '../KanbanModoVendasToggle'
import type { ColunaKanbanId, TipoEntregaFiltro, Venda } from '../types'

type TerminalOpcao = { id: string; nome: string }

export interface VendasUnificadasQueryParams {
  dataCriacaoInicial?: string
  dataCriacaoFinal?: string
  dataFinalizacaoInicio?: string
  dataFinalizacaoFim?: string
  [key: string]: unknown
}

export interface UseKanbanDataQueriesParams {
  modoKanbanVendas: ModoKanbanVendas
  vendasUnificadasQueryParams: VendasUnificadasQueryParams
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
  const queryClient = useQueryClient()
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

  const infiniteQueryKey = useMemo(
    () =>
      isModoDeliveryKanban
        ? (['delivery', 'pedidos', 'infinite', empresaId, 'columns'] as const)
        : vendasUnificadasInfiniteQueryKey(vendasUnificadasQueryParams, empresaId),
    [isModoDeliveryKanban, vendasUnificadasQueryParams, empresaId]
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

  const vendaIdsPdvPorTerminalParams = useMemo(
    () => ({
      terminalId: terminalFilter,
      periodoInicial: vendasUnificadasQueryParams.dataCriacaoInicial,
      periodoFinal: vendasUnificadasQueryParams.dataCriacaoFinal,
      dataFinalizacaoInicio: vendasUnificadasQueryParams.dataFinalizacaoInicio,
      dataFinalizacaoFim: vendasUnificadasQueryParams.dataFinalizacaoFim,
    }),
    [terminalFilter, vendasUnificadasQueryParams]
  )

  const {
    data: vendasUnificadasInfiniteData,
    isLoading: isLoadingUnificado,
    isFetchingNextPage: isFetchingNextPageUnificado,
    hasNextPage: hasNextPageUnificado,
    fetchNextPage: fetchNextPageUnificado,
    refetch: refetchUnificado,
  } = useVendasUnificadasInfinite(vendasUnificadasQueryParams, {
    enabled: hasKanbanToken,
    refetchIntervalMs: !isModoDeliveryKanban ? KANBAN_VENDAS_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: !isModoDeliveryKanban,
  })

  const deliveryKanban = usePedidosDeliveryKanbanColumns(pedidosDeliveryQueryParams, {
    enabled: hasKanbanToken && isModoDeliveryKanban,
    refetchIntervalMs: isModoDeliveryKanban ? KANBAN_DELIVERY_DELTA_POLL_INTERVAL_MS : false,
    refetchOnWindowFocus: isModoDeliveryKanban,
    enviarFiltroCriacaoNaApi: enviarFiltroCriacaoNaDeliveryApi,
    enviarFiltroFinalizacaoNaApi: enviarFiltroFinalizacaoNaDeliveryApi,
  })

  const isLoadingDelivery = deliveryKanban.isLoading
  const refetchDelivery = deliveryKanban.refetch

  const isFetchingNextPage = isModoDeliveryKanban
    ? DELIVERY_KANBAN_COLUMN_IDS.some(id => deliveryKanban.columnStates[id]?.isFetchingNextPage)
    : isFetchingNextPageUnificado
  const hasNextPage = isModoDeliveryKanban
    ? DELIVERY_KANBAN_COLUMN_IDS.some(id => deliveryKanban.columnStates[id]?.hasNextPage)
    : hasNextPageUnificado
  const fetchNextPage = isModoDeliveryKanban ? () => undefined : fetchNextPageUnificado

  const {
    data: vendaIdsPdvPorTerminal,
    isLoading: isLoadingIdsTerminal,
    refetch: refetchIdsTerminal,
  } = useVendaIdsPdvPorTerminal(vendaIdsPdvPorTerminalParams, { enabled: usaFiltroTerminal })

  const isLoading = isModoDeliveryKanban
    ? isLoadingDelivery
    : isLoadingUnificado || (usaFiltroTerminal && isLoadingIdsTerminal)

  const refetch = useCallback(async () => {
    if (isModoDeliveryKanban) {
      await refetchDelivery()
      return
    }
    await queryClient.resetQueries({ queryKey: infiniteQueryKey, exact: true })
    const [result] = await Promise.all([
      refetchUnificado(),
      usaFiltroTerminal ? refetchIdsTerminal() : Promise.resolve(),
    ])
    return result
  }, [
    isModoDeliveryKanban,
    usaFiltroTerminal,
    refetchDelivery,
    refetchUnificado,
    refetchIdsTerminal,
    queryClient,
    infiniteQueryKey,
  ])

  const refetchParaEmissaoFiscal = useCallback(async () => {
    if (isModoDeliveryKanban) {
      await refetchDelivery()
      const items = deliveryKanban.flattenAllItems()
      return { data: { items } }
    }
    const result = await refetchUnificado()
    const { items } = flattenVendasUnificadasInfinite(result.data)
    return { data: { items } }
  }, [isModoDeliveryKanban, refetchDelivery, deliveryKanban.flattenAllItems, refetchUnificado])

  const deliveryKanbanColumnStatesKey = useMemo(
    () => JSON.stringify(deliveryKanban.columnStates),
    [deliveryKanban.columnStates]
  )

  const flattenAllItemsDelivery = deliveryKanban.flattenAllItems

  const { items: todasVendasFlattened, totalCount: totalVendasApi } = useMemo(() => {
    if (isModoDeliveryKanban) {
      const items = flattenAllItemsDelivery()
      return { items, totalCount: items.length }
    }
    return flattenVendasUnificadasInfinite(vendasUnificadasInfiniteData)
  }, [
    isModoDeliveryKanban,
    deliveryKanbanColumnStatesKey,
    flattenAllItemsDelivery,
    vendasUnificadasInfiniteData,
  ])

  const todasVendasCarregadas = useMemo(() => {
    if (!usaFiltroTerminal) return todasVendasFlattened
    if (!vendaIdsPdvPorTerminal) return []
    return todasVendasFlattened.filter(
      v => v.tabelaOrigem === 'venda' && vendaIdsPdvPorTerminal.has(v.id)
    )
  }, [usaFiltroTerminal, vendaIdsPdvPorTerminal, todasVendasFlattened])

  const todasVendasCarregadasRef = useRef(todasVendasCarregadas)
  todasVendasCarregadasRef.current = todasVendasCarregadas

  const temMaisVendasParaCarregar = useMemo(() => {
    if (isModoDeliveryKanban) return false
    if (hasNextPage) return true
    if (
      !usaFiltroTerminal &&
      totalVendasApi > 0 &&
      todasVendasCarregadas.length < totalVendasApi
    ) {
      return true
    }
    return false
  }, [
    isModoDeliveryKanban,
    hasNextPage,
    usaFiltroTerminal,
    totalVendasApi,
    todasVendasCarregadas.length,
  ])

  const handleCarregarMaisVendas = useCallback(() => {
    if (isModoDeliveryKanban) return
    if (isFetchingNextPage || !temMaisVendasParaCarregar) return
    void fetchNextPage()
  }, [
    isModoDeliveryKanban,
    isFetchingNextPage,
    temMaisVendasParaCarregar,
    fetchNextPage,
  ])

  const { onColumnScroll: onGlobalColumnScroll } =
    useKanbanColumnScrollLoadMore(handleCarregarMaisVendas)

  const columnScrollTickingRef = useRef(false)
  const deliveryColumnStatesRef = useRef(deliveryKanban.columnStates)
  deliveryColumnStatesRef.current = deliveryKanban.columnStates

  const fetchNextPageForColumnDelivery = deliveryKanban.fetchNextPageForColumn

  const handleColumnScroll = useCallback(
    (columnId: ColunaKanbanId, event: React.UIEvent<HTMLDivElement>) => {
      if (isModoDeliveryKanban) {
        const state = deliveryColumnStatesRef.current[columnId]
        if (!state?.hasNextPage || state.isFetchingNextPage) return
        if (columnScrollTickingRef.current) return
        const el = event.currentTarget
        if (!el) return
        columnScrollTickingRef.current = true
        requestAnimationFrame(() => {
          columnScrollTickingRef.current = false
          const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight
          if (distanciaDoFim <= 120) {
            fetchNextPageForColumnDelivery(columnId)
          }
        })
        return
      }
      onGlobalColumnScroll(event)
    },
    [isModoDeliveryKanban, fetchNextPageForColumnDelivery, onGlobalColumnScroll]
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
  }, [isModoDeliveryKanban, deliveryKanbanColumnStatesKey, deliveryKanban.columnStates, getEtapaKanbanParaExibicaoRef])

  return {
    isModoDeliveryKanban,
    isLoadingDelivery,
    infiniteQueryKey,
    deliveryKanban,
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
    temMaisVendasParaCarregar,
  }
}
