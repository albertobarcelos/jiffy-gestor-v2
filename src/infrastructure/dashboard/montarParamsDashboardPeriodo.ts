import {
  appendIntervaloFinalizacaoVendasPdv,
  lerIntervaloFinalizacaoVendasPdv,
} from '@/src/shared/utils/parametrosDataFinalizacaoVendasPdv'
import { calcularPeriodoNoFusoEmpresa } from '@/src/shared/utils/periodoNoFusoEmpresa'

const MAP_OPCAO_PERIODO: Record<string, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  semana: 'Últimos 7 Dias',
  '30dias': 'Últimos 30 Dias',
  mes: 'Mês Atual',
  '60dias': 'Últimos 60 Dias',
  '90dias': 'Últimos 90 Dias',
}

/** Params PDV (intervalo + status) para rotas do dashboard V2. */
export function montarParamsDashboardVendasPeriodo(args: {
  requestSearchParams: URLSearchParams
  periodo: string
  timezone: string
  status?: 'FINALIZADA' | 'CANCELADA'
}): URLSearchParams {
  const params = new URLSearchParams()
  const intervaloCustom = lerIntervaloFinalizacaoVendasPdv(args.requestSearchParams)
  if (intervaloCustom) {
    appendIntervaloFinalizacaoVendasPdv(params, intervaloCustom)
  } else if (args.periodo !== 'personalizado' && args.periodo !== 'todos') {
    const opcao = MAP_OPCAO_PERIODO[args.periodo] || 'Hoje'
    const { inicio, fim } = calcularPeriodoNoFusoEmpresa(opcao, args.timezone)
    if (inicio && fim) {
      appendIntervaloFinalizacaoVendasPdv(params, {
        inicial: inicio.toISOString(),
        final: fim.toISOString(),
      })
    }
  }
  params.append('status', args.status ?? 'FINALIZADA')
  return params
}
