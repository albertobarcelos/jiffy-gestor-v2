import { extrairPeriodoIsoDosFiltros } from './vendasListQuery'
import type { MetodoPagamentoRelatorio, VendasFiltrosQuerySnapshot } from './vendasListTypes'

function mapPeriodoPresetParaDashboard(periodo: string): string {
  switch (periodo) {
    case 'Hoje':
      return 'hoje'
    case 'Ontem':
      return 'ontem'
    case 'Últimos 7 Dias':
      return 'semana'
    case 'Mês Atual':
      return 'mes'
    case 'Últimos 30 Dias':
      return '30dias'
    case 'Últimos 60 Dias':
      return '60dias'
    case 'Últimos 90 Dias':
      return '90dias'
    default:
      return 'hoje'
  }
}

/**
 * Busca agregação de formas de pagamento via BFF existente.
 * Quando há datas explícitas (preset ou "Por datas"), usa o mesmo intervalo dos filtros de vendas.
 */
export async function buscarMetodosPagamentoPeriodo(input: {
  filters: VendasFiltrosQuerySnapshot
  token: string
  timeZoneEmpresa: string
}): Promise<MetodoPagamentoRelatorio[]> {
  const { filters, token, timeZoneEmpresa } = input
  const { inicio, fim } = extrairPeriodoIsoDosFiltros(filters, timeZoneEmpresa)

  const params = new URLSearchParams()
  params.append('timezone', timeZoneEmpresa || 'America/Sao_Paulo')

  if (inicio && fim) {
    params.append('periodo', 'personalizado')
    params.append('dataFinalizacaoInicial', inicio)
    params.append('dataFinalizacaoFinal', fim)
  } else if (filters.periodo !== 'Todos') {
    params.append('periodo', mapPeriodoPresetParaDashboard(filters.periodo))
  } else {
    return []
  }

  const response = await fetch(`/api/dashboard/metodos-pagamento?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Erro ao buscar formas de pagamento para exportação')
  }

  const data = (await response.json()) as MetodoPagamentoRelatorio[]
  return Array.isArray(data) ? data : []
}

/** Indica se há filtros além do período que não entram na agregação de pagamentos do dashboard. */
export function temFiltrosExtrasAlemPeriodo(filters: VendasFiltrosQuerySnapshot): boolean {
  return Boolean(
    filters.searchQuery ||
      filters.tipoVendaFilter ||
      filters.meioPagamentoFilter ||
      filters.usuarioAbertoPorFilter ||
      filters.terminalFilter ||
      filters.usuarioCancelouFilter ||
      filters.valorMinimo ||
      filters.valorMaximo ||
      (filters.statusFilter && filters.statusFilter.toUpperCase() !== 'FINALIZADA')
  )
}
