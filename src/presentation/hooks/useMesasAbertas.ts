'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  MesaAbertaSummaryDTO,
  MesasAbertasMetricasDTO,
  UsuarioPdvResumoDTO,
} from '@/src/application/dto/MesasAbertasDTO'
import { METRICAS_MESAS_VAZIAS } from '@/src/application/mappers/MesasAbertasMapper'
import {
  listarMesasAbertasUseCase,
  listarUsuariosPdvMesasUseCase,
} from '@/src/infrastructure/composition/mesasAbertasUseCases'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

const PAGE_SIZE = 100

function dedupeMesas(items: MesaAbertaSummaryDTO[]): MesaAbertaSummaryDTO[] {
  return Array.from(new Map(items.map(v => [v.id, v] as const)).values())
}

export function useMesasAbertas() {
  const [vendas, setVendas] = useState<MesaAbertaSummaryDTO[]>([])
  const [metricas, setMetricas] = useState<MesasAbertasMetricasDTO | null>(null)
  const [usuariosPDV, setUsuariosPDV] = useState<UsuarioPdvResumoDTO[]>([])
  const [apenasSemMovimentacao, setApenasSemMovimentacao] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [canLoadMore, setCanLoadMore] = useState(true)

  const currentPageRef = useRef(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const apenasSemMovimentacaoRef = useRef(apenasSemMovimentacao)
  apenasSemMovimentacaoRef.current = apenasSemMovimentacao

  const requireToken = useCallback((): string | null => {
    return useAuthStore.getState().tenantAuth?.getAccessToken() ?? null
  }, [])

  const loadUsuariosPdv = useCallback(async () => {
    const token = requireToken()
    if (!token) return
    try {
      const usuarios = await listarUsuariosPdvMesasUseCase.execute(token)
      setUsuariosPDV(usuarios)
    } catch (error) {
      console.error('Erro ao carregar usuários PDV:', error)
    }
  }, [requireToken])

  const fetchVendas = useCallback(
    async (resetPage = false, filterWithoutMovement?: boolean) => {
      const token = requireToken()
      if (!token) return

      const apenasSemMov = filterWithoutMovement ?? apenasSemMovimentacaoRef.current

      if (resetPage) {
        setIsLoading(true)
        currentPageRef.current = 0
      } else {
        setIsLoadingMore(true)
      }

      try {
        const page = resetPage ? 0 : currentPageRef.current
        const result = await listarMesasAbertasUseCase.execute({
          token,
          page,
          pageSize: PAGE_SIZE,
          apenasSemMovimentacao: apenasSemMov,
        })

        if (resetPage) {
          setVendas(dedupeMesas(result.items))
          currentPageRef.current = 1
          setMetricas(result.metricas ?? METRICAS_MESAS_VAZIAS)

          setTimeout(() => {
            const container = scrollContainerRef.current
            if (container && result.hasNext) {
              const { scrollHeight, clientHeight } = container
              if (scrollHeight <= clientHeight) {
                void fetchVendas(false, apenasSemMov)
              }
            }
          }, 100)
        } else {
          setVendas(prev => dedupeMesas([...prev, ...result.items]))
          if (result.metricas) setMetricas(result.metricas)
          currentPageRef.current += 1
        }

        setCanLoadMore(result.hasNext)
      } catch (error) {
        console.error('Erro ao buscar vendas:', error)
        showToast.error('Erro ao buscar vendas')
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        setHasLoadedOnce(true)
      }
    },
    [requireToken]
  )

  const setFiltroSemMovimentacao = useCallback(
    (checked: boolean) => {
      setApenasSemMovimentacao(checked)
      void fetchVendas(true, checked)
    },
    [fetchVendas]
  )

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
      if (isNearBottom && canLoadMore && !isLoadingMore && !isLoading) {
        void fetchVendas(false)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [canLoadMore, isLoadingMore, isLoading, fetchVendas])

  useEffect(() => {
    if (!useAuthStore.getState().tenantAuth) return
    void loadUsuariosPdv()
    void fetchVendas(true)
    // Carga inicial; filtro e refresh usam setFiltroSemMovimentacao / refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const montadoEm = Date.now()
    let ultimoPedido = 0
    const aoVoltar = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - montadoEm < 2000) return
      const agora = Date.now()
      if (agora - ultimoPedido < 1500) return
      ultimoPedido = agora
      void fetchVendas(true)
    }
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('focus', aoVoltar)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('focus', aoVoltar)
    }
  }, [fetchVendas])

  return {
    vendas,
    metricas,
    usuariosPDV,
    apenasSemMovimentacao,
    setFiltroSemMovimentacao,
    isLoading,
    hasLoadedOnce,
    isLoadingMore,
    scrollContainerRef,
    refetch: () => fetchVendas(true),
  }
}
