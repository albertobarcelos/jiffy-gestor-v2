import { extrairPeriodoIsoDosFiltros } from '@/src/presentation/utils/vendas/vendasListQuery'
import type { VendasFiltrosQuerySnapshot } from '@/src/presentation/utils/vendas/vendasListTypes'

/** Labels iguais ao dropdown de Relatório de Vendas. */
export const OPCOES_PERIODO_PECA_TAMBEM = [
  'Hoje',
  'Mês Atual',
  'Últimos 7 Dias',
  'Últimos 30 Dias',
  'Últimos 60 Dias',
  'Últimos 90 Dias',
] as const

export type PeriodoPecaTambemLabel = (typeof OPCOES_PERIODO_PECA_TAMBEM)[number]

export function isPeriodoPecaTambemLabel(value: string): value is PeriodoPecaTambemLabel {
  return (OPCOES_PERIODO_PECA_TAMBEM as readonly string[]).includes(value)
}

/**
 * Resolve ISO `de`/`ate` a partir do período da tela de vendas
 * (preset ou intervalo personalizado).
 */
export function resolverIntervaloPecaTambem(params: {
  periodo: string
  periodoInicialIso?: string | null
  periodoFinalIso?: string | null
  timeZoneEmpresa: string
}): { de: string | null; ate: string | null } {
  const tz = params.timeZoneEmpresa.trim() || 'America/Sao_Paulo'
  const periodoInicial = params.periodoInicialIso
    ? new Date(params.periodoInicialIso)
    : null
  const periodoFinal = params.periodoFinalIso
    ? new Date(params.periodoFinalIso)
    : null

  const filters: VendasFiltrosQuerySnapshot = {
    searchQuery: '',
    periodo: params.periodo || 'Últimos 30 Dias',
    tipoVendaFilter: null,
    statusFilter: 'FINALIZADA',
    meioPagamentoFilter: '',
    usuarioAbertoPorFilter: '',
    terminalFilter: '',
    usuarioCancelouFilter: '',
    valorMinimo: '',
    valorMaximo: '',
    periodoInicial:
      periodoInicial && !Number.isNaN(periodoInicial.getTime()) ? periodoInicial : null,
    periodoFinal:
      periodoFinal && !Number.isNaN(periodoFinal.getTime()) ? periodoFinal : null,
  }

  // "Todos" na tela de vendas não tem intervalo — usa 90 dias.
  if (filters.periodo === 'Todos' && !filters.periodoInicial) {
    filters.periodo = 'Últimos 90 Dias'
  }

  const { inicio, fim } = extrairPeriodoIsoDosFiltros(filters, tz)
  return { de: inicio, ate: fim }
}

export function taxaPercentual(numerador: number, denominador: number): number | null {
  if (!denominador || denominador <= 0) return null
  return (numerador / denominador) * 100
}

export function formatarTaxaPct(valor: number | null): string {
  if (valor == null || !Number.isFinite(valor)) return '—'
  return `${valor.toFixed(1).replace('.', ',')}%`
}
