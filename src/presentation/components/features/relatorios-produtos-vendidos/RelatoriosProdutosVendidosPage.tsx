'use client'

import { useCallback, useMemo, useState } from 'react'
import { assumirDateComoNoFusoEmpresaParaUtc, calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'
import { useEmpresaMe } from '@/src/presentation/hooks/useEmpresaMe'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useRelatorioProdutosVendidosQuery } from '@/src/presentation/hooks/useRelatorioProdutosVendidosQuery'
import {
  RelatoriosProdutosVendidosFilters,
  filtroRelatorioParaApiPeriodo,
  filtroParaOpcaoCalculatePeriodo,
  type FiltroPeriodoRelatorio,
  type RelatoriosProdutosVendidosFiltersValues,
} from './RelatoriosProdutosVendidosFilters'
import { RelatoriosProdutosVendidosResumo } from './RelatoriosProdutosVendidosResumo'
import { RelatoriosProdutosVendidosTable } from './RelatoriosProdutosVendidosTable'

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

export function RelatoriosProdutosVendidosPage() {
  const { timezoneAgregacao } = useEmpresaMe()
  const tz = timezoneAgregacao?.trim() || 'America/Sao_Paulo'

  const [filtros, setFiltros] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)
  const [filtrosQuery, setFiltrosQuery] = useState<RelatoriosProdutosVendidosFiltersValues>(defaultFiltros)
  const [offset, setOffset] = useState(0)

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
    filtrosQuery.filtroPeriodo !== 'personalizado' ||
    (periodoInicial != null && periodoFinal != null)

  const { data, isLoading, isError, error } = useRelatorioProdutosVendidosQuery({
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
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Produtos vendidos</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Análise de mix por quantidade e faturamento, curva ABC e comparação do preço médio de venda com o
          preço de cardápio. Dados agregados a partir das vendas PDV finalizadas (mesma base do dashboard).
        </p>
      </header>

      <RelatoriosProdutosVendidosFilters
        values={filtros}
        onChange={handleFiltrosFieldChange}
        onAplicar={onAplicar}
        gruposLoading={gruposLoading}
        grupos={gruposOptions}
      />

      {filtrosQuery.filtroPeriodo === 'personalizado' &&
      (!periodoInicial || !periodoFinal || !queryEnabled) ? (
        <p className="text-sm text-amber-800">
          Selecione início e fim do período personalizado para carregar o relatório.
        </p>
      ) : null}

      <RelatoriosProdutosVendidosResumo data={data} isLoading={isLoading} />

      <RelatoriosProdutosVendidosTable
        items={data?.items ?? []}
        mockAtivo={data?.mockAtivo ?? false}
        offset={offset}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
      />

      {totalFiltrado > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <span>
            Exibindo {offset + 1}–{Math.min(offset + PAGE_SIZE, totalFiltrado)} de {totalFiltrado}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev || isLoading}
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={!canNext || isLoading}
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 font-medium text-gray-700 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
