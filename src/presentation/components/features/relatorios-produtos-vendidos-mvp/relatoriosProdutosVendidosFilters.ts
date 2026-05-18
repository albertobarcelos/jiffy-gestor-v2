import type { RelatorioProdutosVendidosSort } from '@/src/shared/types/relatoriosProdutosVendidosApi'

export type FiltroPeriodoRelatorio =
  | 'todos'
  | 'hoje'
  | 'mes'
  | 'semana'
  | '30dias'
  | '60dias'
  | '90dias'
  | 'ontem'
  | 'personalizado'

/** Mesmas opções do dropdown de período do dashboard / VendasList. */
export const OPCOES_PERIODO_RELATORIO_MVP: ReadonlyArray<{
  value: FiltroPeriodoRelatorio
  label: string
}> = [
  { value: 'todos', label: 'Todos' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'mes', label: 'Mês Atual' },
  { value: 'semana', label: 'Últimos 7 Dias' },
  { value: '30dias', label: 'Últimos 30 Dias' },
  { value: '60dias', label: 'Últimos 60 Dias' },
  { value: '90dias', label: 'Últimos 90 Dias' },
]

export function filtroRelatorioParaApiPeriodo(f: FiltroPeriodoRelatorio): string {
  switch (f) {
    case 'todos':
      return 'todos'
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
}
