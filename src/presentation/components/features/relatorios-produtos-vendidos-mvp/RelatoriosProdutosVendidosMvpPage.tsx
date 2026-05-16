'use client'

import { useCallback, useMemo, useState } from 'react'
import { assumirDateComoNoFusoEmpresaParaUtc, calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useRelatorioProdutosVendidosMvpQuery } from '@/src/presentation/hooks/useRelatorioProdutosVendidosMvpQuery'
import {
  filtroRelatorioParaApiPeriodo,
  filtroParaOpcaoCalculatePeriodo,
  type FiltroPeriodoRelatorio,
  type RelatoriosProdutosVendidosFiltersValues,
} from '@/src/presentation/components/features/relatorios-produtos-vendidos/RelatoriosProdutosVendidosFilters'
import { MvpHeader } from './components/MvpHeader'
import { MvpFiltersBar } from './components/MvpFiltersBar'
import { MvpKpiGrid } from './components/MvpKpiGrid'
import { MvpChartParticipacao } from './components/MvpChartParticipacao'
import { MvpChartEvolucao } from './components/MvpChartEvolucao'
import { MvpProdutosTable } from './components/MvpProdutosTable'
import { MvpInsights } from './components/MvpInsights'

const PAGE_SIZE = 50

const defaultFiltros: RelatoriosProdutosVendidosFiltersValues = {
  filtroPeriodo: '30dias',
  periodoPersonalizadoInicio: null,
  periodoPersonalizadoFim: null,
  sort: 'quantidade_desc',
  grupoId: '',
  valorMin: '',
  valorMax: '',
  qtdMin: '',
  qtdMax: '',
  buscaNome: '',
  mockMargem: false,
}

export function RelatoriosProdutosVendidosMvpPage() {
  const { timezoneAgregacao } = useEmpresaMe()
  const tz = timezoneAgregacao?.trim() || 'America/Sao_Paulo'

  const [filtros, setFiltros] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)
  const [filtrosQuery, setFiltrosQuery] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)
  const [offset, setOffset] = useState(0)
  const [incluirSerie, setIncluirSerie] = useState(true)

  const { data: gruposData, isLoading: gruposLoading } = useGruposProdutos({ limit: 500, ativo: true })
  const gruposOptions = useMemo(
    () => (gruposData ?? []).map(g => ({ id: g.getId(), nome: g.getNome() })),
    [gruposData]
  )

  const periodoApi = filtroRelatorioParaApiPeriodo(filtrosQuery.filtroPeriodo)

  const { inicio: periodoInicial, fim: periodoFinal } = useMemo(() => {
    if (filtrosQuery.filtroPeriodo === 'personalizado') {
      if (filtrosQuery.periodoPersonalizadoInicio && filtrosQuery.periodoPersonalizadoFim) {
        return {
          inicio: assumirDateComoNoFusoEmpresaParaUtc(filtrosQuery.periodoPersonalizadoInicio, tz),
          fim: assumirDateComoNoFusoEmpresaParaUtc(filtrosQuery.periodoPersonalizadoFim, tz),
        }
      }
      return { inicio: null as Date | null, fim: null as Date | null }
    }
    const opcao = filtroParaOpcaoCalculatePeriodo(filtrosQuery.filtroPeriodo as FiltroPeriodoRelatorio)
    return calcularPeriodoNoFusoEmpresa(opcao, tz)
  }, [
    filtrosQuery.filtroPeriodo,
    filtrosQuery.periodoPersonalizadoInicio,
    filtrosQuery.periodoPersonalizadoFim,
    tz,
  ])

  const queryEnabled =
    filtrosQuery.filtroPeriodo !== 'personalizado' || (periodoInicial != null && periodoFinal != null)

  const { data, isLoading, isError, error } = useRelatorioProdutosVendidosMvpQuery({
    periodo: periodoApi,
    periodoInicial: filtrosQuery.filtroPeriodo === 'personalizado' ? periodoInicial : null,
    periodoFinal: filtrosQuery.filtroPeriodo === 'personalizado' ? periodoFinal : null,
    timezone: tz,
    sort: filtrosQuery.sort,
    grupoIds: filtrosQuery.grupoId ? [filtrosQuery.grupoId] : [],
    valorMin: filtrosQuery.valorMin,
    valorMax: filtrosQuery.valorMax,
    qtdMin: filtrosQuery.qtdMin,
    qtdMax: filtrosQuery.qtdMax,
    buscaNome: filtrosQuery.buscaNome,
    limit: PAGE_SIZE,
    offset,
    mockMargem: filtrosQuery.mockMargem,
    incluirSerie,
    enabled: queryEnabled,
  })

  const onAplicar = useCallback(() => {
    setFiltrosQuery(filtros)
    setOffset(0)
  }, [filtros])

  const handleFiltrosFieldChange = useCallback(
    (next: RelatoriosProdutosVendidosFiltersValues) => {
      setFiltros(next)
      const instantChanged =
        next.filtroPeriodo !== filtrosQuery.filtroPeriodo ||
        next.periodoPersonalizadoInicio !== filtrosQuery.periodoPersonalizadoInicio ||
        next.periodoPersonalizadoFim !== filtrosQuery.periodoPersonalizadoFim ||
        next.sort !== filtrosQuery.sort ||
        next.grupoId !== filtrosQuery.grupoId ||
        next.mockMargem !== filtrosQuery.mockMargem

      if (instantChanged) {
        setFiltrosQuery(prev => ({
          ...prev,
          filtroPeriodo: next.filtroPeriodo,
          periodoPersonalizadoInicio: next.periodoPersonalizadoInicio,
          periodoPersonalizadoFim: next.periodoPersonalizadoFim,
          sort: next.sort,
          grupoId: next.grupoId,
          mockMargem: next.mockMargem,
        }))
        setOffset(0)
      }
    },
    [filtrosQuery]
  )

  const totalFiltrado = data?.totalFiltrado ?? 0
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < totalFiltrado

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 py-4 md:py-6">
      <MvpHeader />

      {data?.mockFlags?.comparativoPeriodoAnteriorOmitido ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Comparativo com o período anterior imediato foi omitido (período muito longo, sem vendas no filtro
          atual ou intervalo indisponível). KPIs e deltas de tabela refletem apenas o período selecionado.
        </div>
      ) : null}

      <MvpFiltersBar
        values={filtros}
        onChange={handleFiltrosFieldChange}
        onAplicar={onAplicar}
        gruposLoading={gruposLoading}
        grupos={gruposOptions}
        incluirSerie={incluirSerie}
        onIncluirSerieChange={v => {
          setIncluirSerie(v)
          setOffset(0)
        }}
      />

      {filtrosQuery.filtroPeriodo === 'personalizado' &&
      (!periodoInicial || !periodoFinal || !queryEnabled) ? (
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Selecione início e fim do período personalizado para carregar o relatório.
        </p>
      ) : null}

      <MvpKpiGrid kpis={data?.kpis} isLoading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-2">
        <MvpChartParticipacao dados={data?.participacaoGrupos} isLoading={isLoading} />
        <MvpChartEvolucao
          serieTemporal={data?.serieTemporal}
          serieSimplificada={data?.mockFlags?.serieSimplificada}
          isLoading={isLoading}
          desabilitadoUsuario={!incluirSerie}
        />
      </div>

      <MvpInsights
        kpis={data?.kpis}
        totalFiltrado={totalFiltrado}
        insightsHeuristicos={data?.mockFlags?.insightsHeuristicos}
        comparativoOmitido={data?.mockFlags?.comparativoPeriodoAnteriorOmitido}
      />

      <MvpProdutosTable
        items={data?.items ?? []}
        rankingsPorProduto={data?.rankingsPorProduto ?? []}
        mockAtivo={data?.mockAtivo ?? false}
        offset={offset}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
      />

      {totalFiltrado > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span>
            Exibindo {offset + 1}–{Math.min(offset + PAGE_SIZE, totalFiltrado)} de {totalFiltrado}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev || isLoading}
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!canNext || isLoading}
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
