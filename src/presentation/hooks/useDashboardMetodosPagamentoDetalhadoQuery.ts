import { useMemo } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { DashboardMetodoPagamento } from '@/src/domain/entities/DashboardMetodoPagamento'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

function mapPeriodoToUseCaseFormat(frontendPeriodo: string): string {
  switch (frontendPeriodo) {
    case 'Hoje': return 'hoje'
    case 'Ontem': return 'ontem'
    case 'Últimos 7 Dias': return 'semana'
    case 'Mês Atual': return 'mes'
    case 'Últimos 30 Dias': return '30dias'
    case 'Últimos 60 Dias': return '60dias'
    case 'Últimos 90 Dias': return '90dias'
    default: return 'hoje'
  }
}

type Params = {
  periodo: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  enabled?: boolean
}

export function useDashboardMetodosPagamentoDetalhadoQuery({
  periodo,
  periodoInicial,
  periodoFinal,
  enabled = true,
}: Params) {
  const mappedPeriodo = useMemo(() => mapPeriodoToUseCaseFormat(periodo), [periodo])
  const useCustomDates = !!(periodoInicial && periodoFinal)

  return useSecureTenantQuery(
    [
      'dashboard',
      'metodos-pagamento-detalhado',
      mappedPeriodo,
      useCustomDates ? periodoInicial!.toISOString() : null,
      useCustomDates ? periodoFinal!.toISOString() : null,
    ],
    async () => {
      const params = new URLSearchParams()
      if (useCustomDates) {
        params.append('periodo', 'personalizado')
        params.append('dataFinalizacaoInicial', periodoInicial!.toISOString())
        params.append('dataFinalizacaoFinal', periodoFinal!.toISOString())
      } else {
        params.append('periodo', mappedPeriodo)
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      params.append('timezone', timezone)

      const response = await fetchGestorApi(`/api/dashboard/metodos-pagamento?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Erro ao buscar métodos de pagamento')
      }

      const data = await response.json()

      return data.map((item: {
        metodo: string
        valor: number
        quantidade: number
        percentual: number
        formaPagamentoFiscal?: string
      }) => DashboardMetodoPagamento.create({
        metodo: item.metodo,
        valor: item.valor,
        quantidade: item.quantidade,
        percentual: item.percentual,
        formaPagamentoFiscal: item.formaPagamentoFiscal
      }))
    },
    {
      enabled,
      staleTime: 90_000,
      gcTime: 10 * 60_000,
    }
  )
}
