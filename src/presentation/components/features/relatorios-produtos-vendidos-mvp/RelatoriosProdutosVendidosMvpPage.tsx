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
  useRelatorioProdutosVendidosMvpParticipacaoQuery,
  useRelatorioProdutosVendidosMvpSerieQuery,
} from '@/src/presentation/hooks/useRelatorioProdutosVendidosMvpBlocosQuery'
import {
  filtroRelatorioParaApiPeriodo,
  type RelatoriosProdutosVendidosFiltersValues,
} from './relatoriosProdutosVendidosFilters'
import type { ProdutoRankingAnteriorDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type {
  RelatorioProdutoVendidoLinhaDTO,
  RelatorioProdutosVendidosSort,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MvpFiltersBar } from './components/MvpFiltersBar'
import { MvpKpiGrid } from './components/MvpKpiGrid'
import { MvpChartParticipacao } from './components/MvpChartParticipacao'
import { MvpChartEvolucao } from './components/MvpChartEvolucao'
import { MvpProdutosTable } from './components/MvpProdutosTable'
import { MvpRelatorioToolbarActions } from './components/MvpToolbar'
import { MvpPersonalizarDrawer } from './components/MvpPersonalizarDrawer'
import { MvpPainelAsync } from './components/MvpPainelAsync'
import { useMvpPersonalizacao } from './hooks/useMvpPersonalizacao'
import type { MvpColunaId, MvpPaineisVisibilidade, MvpPersonalizacaoLayout } from './mvpPersonalizacao'

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

function precisaComparativoNasColunas(colunas: MvpColunaId[]): boolean {
  return colunas.includes('varQtd') || colunas.includes('varFat')
}

export function RelatoriosProdutosVendidosMvpPage() {
  const { timezoneAgregacao } = useEmpresaMe()
  const tz = timezoneAgregacao?.trim() || 'America/Sao_Paulo'

  const [filtros, setFiltros] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)
  const [filtrosQuery, setFiltrosQuery] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)
  const [drawerAberto, setDrawerAberto] = useState(false)

  const { layout, persistLayout, patchPaineis } = useMvpPersonalizacao()

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

  const filtrosApi = useMemo(
    () => ({
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
    }),
    [periodoApi, periodoInicialApi, periodoFinalApi, tz, filtrosQuery]
  )

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
    refetch,
  } = useRelatorioProdutosVendidosMvpInfiniteQuery(filtrosApi)

  const firstPage = data?.pages[0]
  const dadosBaseProntos = !!firstPage

  const comparativoOmitido = !!firstPage?.mockFlags?.comparativoPeriodoAnteriorOmitido

  const precisaComparativo =
    !comparativoOmitido &&
    (layout.paineis.kpis || precisaComparativoNasColunas(layout.colunas))

  const {
    data: comparativoData,
    isFetching: comparativoFetching,
    refetch: refetchComparativo,
  } = useRelatorioProdutosVendidosMvpComparativoQuery({
    ...filtrosApi,
    dadosBaseProntos,
    enabled: precisaComparativo,
  })

  const {
    data: participacaoData,
    isFetching: participacaoFetching,
    error: participacaoError,
    refetch: refetchParticipacao,
  } = useRelatorioProdutosVendidosMvpParticipacaoQuery({
    ...filtrosApi,
    dadosBaseProntos,
    enabled: layout.paineis.participacao,
  })

  const {
    data: serieData,
    isFetching: serieFetching,
    error: serieError,
    refetch: refetchSerie,
  } = useRelatorioProdutosVendidosMvpSerieQuery({
    ...filtrosApi,
    dadosBaseProntos,
    enabled: layout.paineis.evolucao,
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
        next.grupoId !== filtrosQuery.grupoId

      if (instantChanged) {
        setFiltrosQuery(prev => ({
          ...prev,
          filtroPeriodo: next.filtroPeriodo,
          periodoPersonalizadoInicio: next.periodoPersonalizadoInicio,
          periodoPersonalizadoFim: next.periodoPersonalizadoFim,
          grupoId: next.grupoId,
        }))
      }
    },
    [filtrosQuery]
  )

  const handleSortChange = useCallback((sort: RelatorioProdutosVendidosSort) => {
    setFiltros(prev => ({ ...prev, sort }))
    setFiltrosQuery(prev => ({ ...prev, sort }))
  }, [])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleAtualizar = useCallback(() => {
    void refetch()
    if (precisaComparativo) void refetchComparativo()
    if (layout.paineis.participacao) void refetchParticipacao()
    if (layout.paineis.evolucao) void refetchSerie()
  }, [
    refetch,
    refetchComparativo,
    refetchParticipacao,
    refetchSerie,
    precisaComparativo,
    layout.paineis.participacao,
    layout.paineis.evolucao,
  ])

  const handleTogglePainel = useCallback(
    (key: keyof MvpPaineisVisibilidade) => {
      patchPaineis({ [key]: !layout.paineis[key] })
    },
    [layout.paineis, patchPaineis]
  )

  const handleAplicarPersonalizacao = useCallback(
    (next: MvpPersonalizacaoLayout) => {
      persistLayout(next)
    },
    [persistLayout]
  )

  const conteudoPrincipalCarregando =
    isLoading || (isFetching && (isPlaceholderData || !firstPage))

  const kpisComparativoPendente =
    layout.paineis.kpis &&
    precisaComparativo &&
    comparativoFetching &&
    !comparativoData

  const atualizando =
    isFetching ||
    (precisaComparativo && comparativoFetching) ||
    (layout.paineis.participacao && participacaoFetching) ||
    (layout.paineis.evolucao && serieFetching)

  return (
    <div className="flex h-full flex-col">
      <div className="flex w-full flex-col py-1">
        <p className="px-[30px] text-lg font-semibold text-primary">Produtos vendidos</p>
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
          acoesToolbar={
            <MvpRelatorioToolbarActions
              onAtualizar={handleAtualizar}
              atualizando={atualizando}
              onPersonalizar={() => setDrawerAberto(true)}
              paineis={layout.paineis}
              onTogglePainel={handleTogglePainel}
            />
          }
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
            {layout.paineis.kpis ? (
              <MvpPainelAsync
                compact
                loading={kpisComparativoPendente}
                error={null}
              >
                <div className="scrollbar-thin -m-1 flex gap-1 overflow-x-auto pb-1">
                  <MvpKpiGrid kpis={kpisExibicao} comparativoPendente={kpisComparativoPendente} />
                </div>
              </MvpPainelAsync>
            ) : null}

            {layout.paineis.participacao || layout.paineis.evolucao ? (
              <div
                className={`m-1 grid gap-2 ${
                  layout.paineis.participacao && layout.paineis.evolucao
                    ? 'xl:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {layout.paineis.participacao ? (
                  <MvpPainelAsync
                    loading={participacaoFetching && !participacaoData}
                    error={participacaoError}
                    minHeightClass="min-h-[min(24rem,45vh)]"
                  >
                    <MvpChartParticipacao dados={participacaoData?.participacaoGrupos} />
                  </MvpPainelAsync>
                ) : null}
                {layout.paineis.evolucao ? (
                  <MvpPainelAsync
                    loading={serieFetching && !serieData}
                    error={serieError}
                    minHeightClass="min-h-[min(24rem,45vh)]"
                  >
                    <MvpChartEvolucao
                      serieTemporal={serieData?.serieTemporal}
                      serieSimplificada={
                        serieData?.mockFlags?.serieSimplificada ??
                        mockFlagsExibicao?.serieSimplificada
                      }
                    />
                  </MvpPainelAsync>
                ) : null}
              </div>
            ) : null}

            <MvpProdutosTable
              items={listItems}
              rankingsPorProduto={rankingsPorProduto}
              totalFiltrado={totalFiltrado}
              colunasVisiveis={layout.colunas}
              sort={filtrosQuery.sort}
              onSortChange={handleSortChange}
              isFetchingNextPage={isFetchingNextPage}
              hasNextPage={hasNextPage ?? false}
              onLoadMore={handleLoadMore}
            />
          </>
        )}
      </div>

      <MvpPersonalizarDrawer
        open={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        layout={layout}
        onAplicar={handleAplicarPersonalizacao}
      />
    </div>
  )
}
