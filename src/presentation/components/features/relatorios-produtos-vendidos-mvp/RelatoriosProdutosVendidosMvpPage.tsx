'use client'

import { useCallback, useMemo, useState } from 'react'
import { assumirDateComoNoFusoEmpresaParaUtc } from '@/src/shared/utils/periodoNoFusoEmpresa'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import {
  useRelatorioProdutosVendidosMvpComparativoQuery,
  useRelatorioProdutosVendidosMvpInfiniteQuery,
} from '@/src/presentation/hooks/useRelatorioProdutosVendidosMvpQuery'
import {
  filtroRelatorioParaApiPeriodo,
  type RelatoriosProdutosVendidosFiltersValues,
} from './relatoriosProdutosVendidosFilters'
import type { ProdutoRankingAnteriorDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type { RelatorioProdutoVendidoLinhaDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MvpFiltersBar } from './components/MvpFiltersBar'
import { MvpKpiGrid } from './components/MvpKpiGrid'
import { MvpChartParticipacao } from './components/MvpChartParticipacao'
import { MvpChartEvolucao } from './components/MvpChartEvolucao'
import { MvpProdutosTable } from './components/MvpProdutosTable'

const defaultFiltros: RelatoriosProdutosVendidosFiltersValues = {
  filtroPeriodo: 'hoje',
  periodoPersonalizadoInicio: null,
  periodoPersonalizadoFim: null,
  sort: 'quantidade_desc',
  grupoId: '',
  valorMin: '',
  valorMax: '',
  qtdMin: '',
  qtdMax: '',
  buscaNome: '',
}

export function RelatoriosProdutosVendidosMvpPage() {
  const { timezoneAgregacao } = useEmpresaMe()
  const tz = timezoneAgregacao?.trim() || 'America/Sao_Paulo'

  const [filtros, setFiltros] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)
  const [filtrosQuery, setFiltrosQuery] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)

  const { data: gruposData, isLoading: gruposLoading } = useGruposProdutos({ limit: 500, ativo: true })
  const gruposOptions = useMemo(
    () => (gruposData ?? []).map(g => ({ id: g.getId(), nome: g.getNome() })),
    [gruposData]
  )

  const periodoApi = filtroRelatorioParaApiPeriodo(filtrosQuery.filtroPeriodo)

  const temIntervaloPorDatas =
    filtrosQuery.periodoPersonalizadoInicio != null && filtrosQuery.periodoPersonalizadoFim != null

  const periodoInicialApi = useMemo(() => {
    if (!temIntervaloPorDatas || !filtrosQuery.periodoPersonalizadoInicio) return null
    return assumirDateComoNoFusoEmpresaParaUtc(filtrosQuery.periodoPersonalizadoInicio, tz)
  }, [temIntervaloPorDatas, filtrosQuery.periodoPersonalizadoInicio, tz])

  const periodoFinalApi = useMemo(() => {
    if (!temIntervaloPorDatas || !filtrosQuery.periodoPersonalizadoFim) return null
    return assumirDateComoNoFusoEmpresaParaUtc(filtrosQuery.periodoPersonalizadoFim, tz)
  }, [temIntervaloPorDatas, filtrosQuery.periodoPersonalizadoFim, tz])

  const {
    data,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRelatorioProdutosVendidosMvpInfiniteQuery({
    periodo: periodoApi,
    periodoInicial: periodoInicialApi,
    periodoFinal: periodoFinalApi,
    timezone: tz,
    sort: filtrosQuery.sort,
    grupoIds: filtrosQuery.grupoId ? [filtrosQuery.grupoId] : [],
    valorMin: filtrosQuery.valorMin,
    valorMax: filtrosQuery.valorMax,
    qtdMin: filtrosQuery.qtdMin,
    qtdMax: filtrosQuery.qtdMax,
    buscaNome: filtrosQuery.buscaNome,
  })

  const firstPage = data?.pages[0]

  const { data: comparativoData, isFetching: comparativoFetching } =
    useRelatorioProdutosVendidosMvpComparativoQuery({
      periodo: periodoApi,
      periodoInicial: periodoInicialApi,
      periodoFinal: periodoFinalApi,
      timezone: tz,
      sort: filtrosQuery.sort,
      grupoIds: filtrosQuery.grupoId ? [filtrosQuery.grupoId] : [],
      valorMin: filtrosQuery.valorMin,
      valorMax: filtrosQuery.valorMax,
      qtdMin: filtrosQuery.qtdMin,
      qtdMax: filtrosQuery.qtdMax,
      buscaNome: filtrosQuery.buscaNome,
      dadosBaseProntos: !!firstPage && !firstPage.mockFlags?.comparativoPeriodoAnteriorOmitido,
    })

  const kpisExibicao = comparativoData?.kpis ?? firstPage?.kpis
  const mockFlagsExibicao = comparativoData?.mockFlags ?? firstPage?.mockFlags

  const listItems = useMemo((): RelatorioProdutoVendidoLinhaDTO[] => {
    return data?.pages.flatMap(p => p.items) ?? []
  }, [data])

  const rankingsPorProduto = useMemo((): ProdutoRankingAnteriorDTO[] => {
    if (comparativoData?.rankingsPorProduto?.length) {
      return comparativoData.rankingsPorProduto
    }
    const map = new Map<string, ProdutoRankingAnteriorDTO>()
    for (const page of data?.pages ?? []) {
      for (const r of page.rankingsPorProduto) {
        map.set(r.produtoId, r)
      }
    }
    return [...map.values()]
  }, [comparativoData, data])

  const totalFiltrado = firstPage?.totalFiltrado ?? 0

  const onAplicar = useCallback(() => {
    setFiltrosQuery(filtros)
  }, [filtros])

  const onLimpar = useCallback(() => {
    setFiltros(defaultFiltros)
    setFiltrosQuery(defaultFiltros)
  }, [])

  const handleFiltrosFieldChange = useCallback(
    (next: RelatoriosProdutosVendidosFiltersValues) => {
      setFiltros(next)
      const instantChanged =
        next.filtroPeriodo !== filtrosQuery.filtroPeriodo ||
        next.periodoPersonalizadoInicio !== filtrosQuery.periodoPersonalizadoInicio ||
        next.periodoPersonalizadoFim !== filtrosQuery.periodoPersonalizadoFim ||
        next.sort !== filtrosQuery.sort ||
        next.grupoId !== filtrosQuery.grupoId

      if (instantChanged) {
        setFiltrosQuery(prev => ({
          ...prev,
          filtroPeriodo: next.filtroPeriodo,
          periodoPersonalizadoInicio: next.periodoPersonalizadoInicio,
          periodoPersonalizadoFim: next.periodoPersonalizadoFim,
          sort: next.sort,
          grupoId: next.grupoId,
        }))
      }
    },
    [filtrosQuery]
  )

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  /** KPIs + gráficos + tabela: um único loading central até a 1ª página (ou novo filtro). */
  const conteudoPrincipalCarregando =
    isLoading || (isFetching && (isPlaceholderData || !firstPage))

  const kpisComparativoPendente =
    !!firstPage &&
    !firstPage.mockFlags?.comparativoPeriodoAnteriorOmitido &&
    comparativoFetching &&
    !comparativoData

  return (
    <div className="flex h-full flex-col">
      <div className="flex w-full flex-col py-1">
        <p className="px-[30px] text-lg font-semibold text-primary">Produtos vendidos</p>
        <p className="px-[30px] text-xs text-secondary-text">
          KPIs, participação por grupo e tendência dos principais produtos — dados das vendas PDV finalizadas.
        </p>
      </div>
      <div className="h-[1px] flex-shrink-0 border-t-2 border-primary/70" />

      <div className="bg-primary-background rounded-b-lg rounded-t-lg">
        <MvpFiltersBar
          values={filtros}
          onChange={handleFiltrosFieldChange}
          onAplicar={onAplicar}
          onLimpar={onLimpar}
          timezoneAgregacao={tz}
          gruposLoading={gruposLoading}
          grupos={gruposOptions}
        />

        {conteudoPrincipalCarregando ? (
          <div className="flex min-h-[min(50vh,32rem)] items-center justify-center py-12">
            <JiffyLoading />
          </div>
        ) : isError ? (
          <div className="font-nunito m-4 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            {error instanceof Error ? error.message : 'Erro ao carregar relatório.'}
          </div>
        ) : (
          <>
            <div className="scrollbar-thin m-1 flex gap-1 overflow-x-auto pb-1">
              <MvpKpiGrid kpis={kpisExibicao} comparativoPendente={kpisComparativoPendente} />
            </div>

            <div className="m-1 grid gap-2 xl:grid-cols-2">
              <MvpChartParticipacao dados={firstPage?.participacaoGrupos} />
              <MvpChartEvolucao
                serieTemporal={firstPage?.serieTemporal}
                serieSimplificada={mockFlagsExibicao?.serieSimplificada}
              />
            </div>

            <MvpProdutosTable
              items={listItems}
              rankingsPorProduto={rankingsPorProduto}
              totalFiltrado={totalFiltrado}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage ?? false}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </div>
    </div>
  )
}
