'use client'

import type { RelatorioProdutosVendidosSort } from '@/src/shared/types/relatoriosProdutosVendidosApi'

export type FiltroPeriodoRelatorio =
  | 'hoje'
  | 'ontem'
  | 'semana'
  | '30dias'
  | 'mes'
  | '60dias'
  | '90dias'
  | 'personalizado'

export function filtroRelatorioParaApiPeriodo(f: FiltroPeriodoRelatorio): string {
  switch (f) {
    case 'hoje':
      return 'hoje'
    case 'ontem':
      return 'ontem'
    case 'semana':
      return 'semana'
    case '30dias':
      return '30dias'
    case 'mes':
      return 'mes'
    case '60dias':
      return '60dias'
    case '90dias':
      return '90dias'
    case 'personalizado':
      return 'personalizado'
    default:
      return 'hoje'
  }
}

function filtroParaOpcaoCalculatePeriodo(f: FiltroPeriodoRelatorio): string {
  switch (f) {
    case 'hoje':
      return 'Hoje'
    case 'ontem':
      return 'Ontem'
    case 'semana':
      return 'Últimos 7 Dias'
    case '30dias':
      return 'Últimos 30 Dias'
    case 'mes':
      return 'Mês Atual'
    case '60dias':
      return 'Últimos 60 Dias'
    case '90dias':
      return 'Últimos 90 Dias'
    case 'personalizado':
      return 'Hoje'
    default:
      return 'Hoje'
  }
}

export interface RelatoriosProdutosVendidosFiltersValues {
  filtroPeriodo: FiltroPeriodoRelatorio
  periodoPersonalizadoInicio: Date | null
  periodoPersonalizadoFim: Date | null
  sort: RelatorioProdutosVendidosSort
  grupoId: string
  valorMin: string
  valorMax: string
  qtdMin: string
  qtdMax: string
  buscaNome: string
  mockMargem: boolean
}

interface RelatoriosProdutosVendidosFiltersProps {
  values: RelatoriosProdutosVendidosFiltersValues
  onChange: (next: RelatoriosProdutosVendidosFiltersValues) => void
  onAplicar: () => void
  gruposLoading: boolean
  grupos: { id: string; nome: string }[]
}

export function RelatoriosProdutosVendidosFilters({
  values,
  onChange,
  onAplicar,
  gruposLoading,
  grupos,
}: RelatoriosProdutosVendidosFiltersProps) {
  const set = (patch: Partial<RelatoriosProdutosVendidosFiltersValues>) => {
    onChange({ ...values, ...patch })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-800">Filtros</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Período
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            value={values.filtroPeriodo}
            onChange={e => set({ filtroPeriodo: e.target.value as FiltroPeriodoRelatorio })}
          >
            <option value="hoje">Hoje</option>
            <option value="ontem">Ontem</option>
            <option value="semana">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
            <option value="mes">Mês atual</option>
            <option value="60dias">Últimos 60 dias</option>
            <option value="90dias">Últimos 90 dias</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </label>

        {values.filtroPeriodo === 'personalizado' ? (
          <>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Início
              <input
                type="datetime-local"
                className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
                value={toLocalInput(values.periodoPersonalizadoInicio)}
                onChange={e =>
                  set({ periodoPersonalizadoInicio: fromLocalInput(e.target.value) })
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              Fim
              <input
                type="datetime-local"
                className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
                value={toLocalInput(values.periodoPersonalizadoFim)}
                onChange={e => set({ periodoPersonalizadoFim: fromLocalInput(e.target.value) })}
              />
            </label>
          </>
        ) : null}

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Ordenação
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            value={values.sort}
            onChange={e => set({ sort: e.target.value as RelatorioProdutosVendidosSort })}
          >
            <option value="quantidade_desc">Mais vendidos (qtd)</option>
            <option value="quantidade_asc">Menos vendidos (qtd)</option>
            <option value="valor_desc">Maior faturamento</option>
            <option value="valor_asc">Menor faturamento</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Grupo de produtos
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            disabled={gruposLoading}
            value={values.grupoId}
            onChange={e => set({ grupoId: e.target.value })}
          >
            <option value="">Todos os grupos</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Valor faturado mín. (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            value={values.valorMin}
            onChange={e => set({ valorMin: e.target.value })}
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Valor faturado máx. (R$)
          <input
            type="number"
            min={0}
            step="0.01"
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            value={values.valorMax}
            onChange={e => set({ valorMax: e.target.value })}
            placeholder="—"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Qtd. mín.
          <input
            type="number"
            min={0}
            step="1"
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            value={values.qtdMin}
            onChange={e => set({ qtdMin: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-600">
          Qtd. máx.
          <input
            type="number"
            min={0}
            step="1"
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            value={values.qtdMax}
            onChange={e => set({ qtdMax: e.target.value })}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-gray-600 md:col-span-2">
          Busca por nome do produto
          <input
            type="search"
            className="rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900"
            value={values.buscaNome}
            onChange={e => set({ buscaNome: e.target.value })}
            placeholder="Ex.: pizza, refrigerante…"
          />
        </label>

        <label className="flex items-center gap-2 text-xs text-gray-700 md:col-span-2">
          <input
            type="checkbox"
            checked={values.mockMargem}
            onChange={e => set({ mockMargem: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          Exibir margem bruta (demonstração — aguardando CMV no backend)
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAplicar}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  )
}

function toLocalInput(d: Date | null): string {
  if (!d || Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(v: string): Date | null {
  if (!v.trim()) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

export { filtroParaOpcaoCalculatePeriodo }
