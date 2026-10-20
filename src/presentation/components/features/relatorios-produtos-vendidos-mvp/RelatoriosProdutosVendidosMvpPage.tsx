'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { assumirDateComoNoFusoEmpresaParaUtc } from '@/src/shared/utils/periodoNoFusoEmpresa'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useGruposComplementos } from '@/src/presentation/hooks/useGruposComplementos'
import {
  useRelatorioProdutosVendidosMvpComparativoQuery,
  useRelatorioProdutosVendidosMvpInfiniteQuery,
} from '@/src/presentation/hooks/useRelatorioProdutosVendidosMvpQuery'
import {
  useRelatorioProdutosVendidosMvpComplementosQuery,
  useRelatorioProdutosVendidosMvpParticipacaoAbcQuery,
  useRelatorioProdutosVendidosMvpParticipacaoQuery,
  useRelatorioProdutosVendidosMvpSerieQuery,
} from '@/src/presentation/hooks/useRelatorioProdutosVendidosMvpBlocosQuery'
import {
  filtroRelatorioParaApiPeriodo,
  type RelatoriosProdutosVendidosFiltersValues,
} from './relatoriosProdutosVendidosFilters'
import type { ProdutoRankingAnteriorDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type { RelatorioComplementoImpacto } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import type {
  RelatorioProdutoVendidoLinhaDTO,
  RelatorioProdutosVendidosSort,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { MvpFiltersBar } from './components/MvpFiltersBar'
import { MvpKpiGrid } from './components/MvpKpiGrid'
import { MvpChartAbc } from './components/MvpChartAbc'
import { MvpChartParticipacao } from './components/MvpChartParticipacao'
import { MvpChartEvolucao } from './components/MvpChartEvolucao'
import { MvpProdutosTable } from './components/MvpProdutosTable'
import { MvpComplementosPainel } from './components/MvpComplementosPainel'
import { MvpComplementosKpiGrid } from './components/MvpComplementosKpiGrid'
import { MvpChartImpactoComplementos } from './components/MvpChartImpactoComplementos'
import { MvpChartQuantidadeComplementos } from './components/MvpChartQuantidadeComplementos'
import {
  MvpPlanilhaAbas,
  type MvpPlanilhaAbaId,
} from './components/MvpPlanilhaAbas'
import { MvpRelatorioToolbarActions } from './components/MvpToolbar'
import { MvpPersonalizarDrawer } from './components/MvpPersonalizarDrawer'
import { MvpPainelAsync } from './components/MvpPainelAsync'
import { MvpChartModal } from './components/MvpChartModal'
import { useMvpChartTipos } from './hooks/useMvpChartTipos'
import { useMvpPersonalizacao } from './hooks/useMvpPersonalizacao'
import type { MvpColunaId, MvpPersonalizacaoLayout } from './mvpPersonalizacao'

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
  const [modalGrafico, setModalGrafico] = useState<
    'grupos' | 'abc' | 'evolucao' | 'impacto' | 'quantidade' | null
  >(null)
  const [abaPlanilha, setAbaPlanilha] = useState<MvpPlanilhaAbaId>('produtos')
  const [impactoComplemento, setImpactoComplemento] = useState<
    RelatorioComplementoImpacto | 'todos'
  >('todos')
  const [grupoComplementoId, setGrupoComplementoId] = useState('')

  const modoComplementos = abaPlanilha === 'complementos'
  const modalGruposAberto = modalGrafico === 'grupos'
  const modalAbcAberto = modalGrafico === 'abc'
  const modalEvolucaoAberto = modalGrafico === 'evolucao'
  const modalImpactoAberto = modalGrafico === 'impacto'
  const modalQuantidadeAberto = modalGrafico === 'quantidade'

  const { layout, persistLayout, patchPaineis } = useMvpPersonalizacao()
  const { tipoGrupos, tipoEvolucao, setTipoGrupos, setTipoEvolucao } = useMvpChartTipos()

  const { data: gruposData, isLoading: gruposProdutosLoading } = useGruposProdutos({
    limit: 500,
    ativo: true,
  })
  const { data: gruposComplementosData, isLoading: gruposComplementosLoading } =
    useGruposComplementos({
      limit: 100,
      ativo: true,
    })

  const gruposOptions = useMemo(() => {
    if (modoComplementos) {
      return (gruposComplementosData ?? []).map(g => ({ id: g.getId(), nome: g.getNome() }))
    }
    return (gruposData ?? []).map(g => ({ id: g.getId(), nome: g.getNome() }))
  }, [modoComplementos, gruposComplementosData, gruposData])

  const gruposLoading = modoComplementos ? gruposComplementosLoading : gruposProdutosLoading

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

  const [totalProdutosEsperado, setTotalProdutosEsperado] = useState<number | undefined>(undefined)

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
      totalProdutosEsperado,
    }),
    [periodoApi, periodoInicialApi, periodoFinalApi, tz, filtrosQuery, totalProdutosEsperado]
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
    enabled: modalGruposAberto,
  })

  const {
    data: participacaoAbcData,
    isFetching: participacaoAbcFetching,
    error: participacaoAbcError,
    refetch: refetchParticipacaoAbc,
  } = useRelatorioProdutosVendidosMvpParticipacaoAbcQuery({
    ...filtrosApi,
    dadosBaseProntos,
    enabled: modalAbcAberto,
  })

  const {
    data: serieData,
    isFetching: serieFetching,
    error: serieError,
    refetch: refetchSerie,
  } = useRelatorioProdutosVendidosMvpSerieQuery({
    ...filtrosApi,
    dadosBaseProntos,
    enabled: modalEvolucaoAberto,
  })

  const {
    data: complementosData,
    isFetching: complementosFetching,
    isLoading: complementosLoading,
    isError: complementosIsError,
    error: complementosError,
    refetch: refetchComplementos,
  } = useRelatorioProdutosVendidosMvpComplementosQuery({
    ...filtrosApi,
    dadosBaseProntos,
    enabled: modoComplementos,
    impactoComplemento,
    grupoComplementoIds: grupoComplementoId ? [grupoComplementoId] : [],
  })

  const kpisExibicao = comparativoData?.kpis ?? firstPage?.kpis
  const mockFlagsExibicao = comparativoData?.mockFlags ?? firstPage?.mockFlags

  useEffect(() => {
    setTotalProdutosEsperado(undefined)
  }, [filtrosQuery])

  useEffect(() => {
    const total =
      comparativoData?.kpis?.produtosDistintosAtual ?? firstPage?.kpis?.produtosDistintosAtual
    if (total != null && total !== totalProdutosEsperado) {
      setTotalProdutosEsperado(total)
    }
  }, [
    comparativoData?.kpis?.produtosDistintosAtual,
    firstPage?.kpis?.produtosDistintosAtual,
    totalProdutosEsperado,
  ])

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

  const totalFiltrado = useMemo(() => {
    const pages = data?.pages ?? []
    const fromPages = pages.length ? Math.max(...pages.map(p => p.totalFiltrado ?? 0)) : 0
    const fromKpi = kpisExibicao?.produtosDistintosAtual ?? 0
    return Math.max(fromPages, fromKpi)
  }, [data, kpisExibicao])

  const temMaisProdutosNaLista = listItems.length < totalFiltrado
  const hasNextPageEfetivo = (hasNextPage ?? false) || temMaisProdutosNaLista

  const onAplicar = useCallback(() => {
    setFiltrosQuery(filtros)
  }, [filtros])

  const onLimpar = useCallback(() => {
    setFiltros(prev => ({
      ...defaultFiltros,
      filtroPeriodo: prev.filtroPeriodo,
      periodoPersonalizadoInicio: prev.periodoPersonalizadoInicio,
      periodoPersonalizadoFim: prev.periodoPersonalizadoFim,
    }))
    setFiltrosQuery(prev => ({
      ...defaultFiltros,
      filtroPeriodo: prev.filtroPeriodo,
      periodoPersonalizadoInicio: prev.periodoPersonalizadoInicio,
      periodoPersonalizadoFim: prev.periodoPersonalizadoFim,
    }))
    setImpactoComplemento('todos')
    setGrupoComplementoId('')
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
    if (isFetchingNextPage || !hasNextPageEfetivo) return
    void fetchNextPage()
  }, [hasNextPageEfetivo, isFetchingNextPage, fetchNextPage])

  /**
   * Sempre carrega todas as linhas do período (não depende de scroll).
   * Páginas após a 1ª usam `somentePagina` no BFF (agregado já em cache — barato).
   */
  useEffect(() => {
    if (!dadosBaseProntos || isLoading || isFetchingNextPage) return
    if (!hasNextPageEfetivo) return
    void fetchNextPage()
  }, [
    dadosBaseProntos,
    isLoading,
    isFetchingNextPage,
    hasNextPageEfetivo,
    fetchNextPage,
    listItems.length,
    totalFiltrado,
  ])

  const handleAtualizar = useCallback(() => {
    void refetch()
    if (precisaComparativo) void refetchComparativo()
    if (modalGruposAberto) void refetchParticipacao()
    if (modalAbcAberto) void refetchParticipacaoAbc()
    if (modalEvolucaoAberto) void refetchSerie()
    if (modoComplementos) void refetchComplementos()
  }, [
    refetch,
    refetchComparativo,
    refetchParticipacao,
    refetchParticipacaoAbc,
    refetchSerie,
    refetchComplementos,
    precisaComparativo,
    modalGruposAberto,
    modalAbcAberto,
    modalEvolucaoAberto,
    modoComplementos,
  ])

  const handleToggleKpis = useCallback(() => {
    patchPaineis({ kpis: !layout.paineis.kpis })
  }, [layout.paineis.kpis, patchPaineis])

  const handleToggleModalGrupos = useCallback(() => {
    setModalGrafico(prev => (prev === 'grupos' ? null : 'grupos'))
  }, [])

  const handleToggleModalAbc = useCallback(() => {
    setModalGrafico(prev => (prev === 'abc' ? null : 'abc'))
  }, [])

  const handleToggleModalEvolucao = useCallback(() => {
    setModalGrafico(prev => (prev === 'evolucao' ? null : 'evolucao'))
  }, [])

  const handleToggleModalImpacto = useCallback(() => {
    setModalGrafico(prev => (prev === 'impacto' ? null : 'impacto'))
  }, [])

  const handleToggleModalQuantidade = useCallback(() => {
    setModalGrafico(prev => (prev === 'quantidade' ? null : 'quantidade'))
  }, [])

  const handleFecharModalGrafico = useCallback(() => {
    setModalGrafico(null)
  }, [])

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
    (modalGruposAberto && participacaoFetching) ||
    (modalAbcAberto && participacaoAbcFetching) ||
    (modalEvolucaoAberto && serieFetching) ||
    (modoComplementos && complementosFetching)

  return (
    <div className="flex h-full flex-col">
      <div className="flex w-full flex-col py-1">
        <p className="px-[30px] text-lg font-semibold text-primary">Relatórios de Produtos Vendidos</p>
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
          grupoLabel={modoComplementos ? 'Grupo de complementos' : 'Grupo de produtos'}
          grupoPlaceholder="Todos os grupos"
          grupoIdValue={modoComplementos ? grupoComplementoId : filtros.grupoId}
          onGrupoIdChange={id => {
            if (modoComplementos) {
              setGrupoComplementoId(id)
              return
            }
            handleFiltrosFieldChange({ ...filtros, grupoId: id })
          }}
          exibirFiltroImpacto={modoComplementos}
          impactoComplemento={impactoComplemento}
          onImpactoComplementoChange={setImpactoComplemento}
          acoesToolbar={
            <MvpRelatorioToolbarActions
              onAtualizar={handleAtualizar}
              atualizando={atualizando}
              onPersonalizar={() => setDrawerAberto(true)}
              kpisVisivel={layout.paineis.kpis}
              onToggleKpis={handleToggleKpis}
              modalGruposAberto={modalGruposAberto}
              onToggleModalGrupos={handleToggleModalGrupos}
              modalAbcAberto={modalAbcAberto}
              onToggleModalAbc={handleToggleModalAbc}
              modalEvolucaoAberto={modalEvolucaoAberto}
              onToggleModalEvolucao={handleToggleModalEvolucao}
              mostrarAcoesSomenteProdutos={!modoComplementos}
              modalImpactoAberto={modalImpactoAberto}
              onToggleModalImpacto={handleToggleModalImpacto}
              modalQuantidadeAberto={modalQuantidadeAberto}
              onToggleModalQuantidade={handleToggleModalQuantidade}
            />
          }
        />

        {conteudoPrincipalCarregando ? (
          <div className="flex min-h-[min(50vh,32rem)] items-center justify-center py-12">
            <JiffyLoading />
          </div>
        ) : isError ? (
          <div className="m-4 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
            {error instanceof Error ? error.message : 'Erro ao carregar relatório.'}
          </div>
        ) : (
          <>
            {layout.paineis.kpis ? (
              <MvpPainelAsync
                compact
                loading={
                  modoComplementos
                    ? (complementosLoading || complementosFetching) && !complementosData
                    : kpisComparativoPendente
                }
                error={null}
              >
                <div className="scrollbar-thin -m-1 flex gap-1 overflow-x-auto pb-1">
                  {modoComplementos ? (
                    <MvpComplementosKpiGrid kpis={complementosData?.kpis} />
                  ) : (
                    <MvpKpiGrid
                      kpis={kpisExibicao}
                      comparativoPendente={kpisComparativoPendente}
                    />
                  )}
                </div>
              </MvpPainelAsync>
            ) : null}

            <div className="flex flex-col pb-2">
              {modoComplementos ? (
                <div className="mb-0 [&>div]:mb-0 [&>div]:rounded-b-none [&>div]:border-b-0">
                  <MvpComplementosPainel
                    items={complementosData?.items ?? []}
                    isLoading={
                      (complementosLoading || complementosFetching) && !complementosData
                    }
                    isError={complementosIsError}
                    errorMessage={
                      complementosError instanceof Error
                        ? complementosError.message
                        : undefined
                    }
                    onRetry={() => void refetchComplementos()}
                  />
                </div>
              ) : (
                <div className="mb-0 [&>div]:mb-0 [&>div]:rounded-b-none [&>div]:border-b-0">
                  <MvpProdutosTable
                    items={listItems}
                    rankingsPorProduto={rankingsPorProduto}
                    totalFiltrado={totalFiltrado}
                    colunasVisiveis={layout.colunas}
                    sort={filtrosQuery.sort}
                    onSortChange={handleSortChange}
                    isFetchingNextPage={isFetchingNextPage}
                    hasNextPage={hasNextPageEfetivo}
                    onLoadMore={handleLoadMore}
                  />
                </div>
              )}
              <MvpPlanilhaAbas
                abaAtiva={abaPlanilha}
                onChange={aba => {
                  setAbaPlanilha(aba)
                  if (aba === 'complementos') {
                    setModalGrafico(null)
                    setDrawerAberto(false)
                  }
                }}
              />
            </div>
          </>
        )}
      </div>

      <MvpPersonalizarDrawer
        open={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        layout={layout}
        onAplicar={handleAplicarPersonalizacao}
      />

      <MvpChartModal
        open={modalGruposAberto}
        onClose={handleFecharModalGrafico}
        title="Participação por grupos"
      >
        <MvpPainelAsync
          loading={participacaoFetching && !participacaoData}
          error={participacaoError}
          minHeightClass="min-h-[min(24rem,50vh)]"
        >
          <MvpChartParticipacao
            dados={participacaoData?.participacaoGrupos}
            tipoGrafico={tipoGrupos}
            onTipoGraficoChange={setTipoGrupos}
          />
        </MvpPainelAsync>
      </MvpChartModal>

      <MvpChartModal
        open={modalAbcAberto}
        onClose={handleFecharModalGrafico}
        title="Distribuição de Curvas ABC"
      >
        <MvpPainelAsync
          loading={participacaoAbcFetching && !participacaoAbcData}
          error={participacaoAbcError}
          minHeightClass="min-h-[min(24rem,50vh)]"
        >
          <MvpChartAbc dados={participacaoAbcData?.participacaoAbc} />
        </MvpPainelAsync>
      </MvpChartModal>

      <MvpChartModal
        open={modalEvolucaoAberto}
        onClose={handleFecharModalGrafico}
        title="Evolução diária"
      >
        <MvpPainelAsync
          loading={serieFetching && !serieData}
          error={serieError}
          minHeightClass="min-h-[min(24rem,50vh)]"
        >
          <MvpChartEvolucao
            serieTemporal={serieData?.serieTemporal}
            serieSimplificada={
              serieData?.mockFlags?.serieSimplificada ?? mockFlagsExibicao?.serieSimplificada
            }
            serieGranularidade={
              serieData?.mockFlags?.serieGranularidade ?? mockFlagsExibicao?.serieGranularidade
            }
            tipoGrafico={tipoEvolucao}
            onTipoGraficoChange={setTipoEvolucao}
          />
        </MvpPainelAsync>
      </MvpChartModal>

      <MvpChartModal
        open={modalImpactoAberto}
        onClose={handleFecharModalGrafico}
        title="Distribuição por impacto"
      >
        <MvpPainelAsync
          loading={(complementosLoading || complementosFetching) && !complementosData}
          error={
            complementosIsError
              ? complementosError instanceof Error
                ? complementosError
                : new Error('Não foi possível carregar os complementos.')
              : null
          }
          minHeightClass="min-h-[min(24rem,50vh)]"
        >
          <MvpChartImpactoComplementos items={complementosData?.items} />
        </MvpPainelAsync>
      </MvpChartModal>

      <MvpChartModal
        open={modalQuantidadeAberto}
        onClose={handleFecharModalGrafico}
        title="Quantidade vendida"
      >
        <MvpPainelAsync
          loading={(complementosLoading || complementosFetching) && !complementosData}
          error={
            complementosIsError
              ? complementosError instanceof Error
                ? complementosError
                : new Error('Não foi possível carregar os complementos.')
              : null
          }
          minHeightClass="min-h-[min(24rem,50vh)]"
        >
          <MvpChartQuantidadeComplementos items={complementosData?.items} />
        </MvpPainelAsync>
      </MvpChartModal>
    </div>
  )
}
