import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BuscarMetodosPagamentoDetalhadoUseCase } from '@/src/application/use-cases/dashboard/BuscarMetodosPagamentoDetalhadoUseCase'

function mapPeriodoToUseCaseFormat(frontendPeriodo: string): string {
  switch (frontendPeriodo) {
    case 'Hoje':
      return 'hoje'
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
    case 'Todos':
      return 'todos'
    default:
      return 'mes'
  }
}

type Params = {
  periodo: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  enabled?: boolean
}

/**
 * Agrega métodos de pagamento no período; cache reduz espera ao reabrir o modal com os mesmos filtros.
 */
export function useDashboardMetodosPagamentoDetalhadoQuery({
  periodo,
  periodoInicial,
  periodoFinal,
  enabled = true,
}: Params) {
  const mappedPeriodo = useMemo(() => mapPeriodoToUseCaseFormat(periodo), [periodo])
  const useCustomDates = !!(periodoInicial && periodoFinal)

  return useQuery({
    queryKey: [
      'dashboard',
      'metodos-pagamento-detalhado',
      mappedPeriodo,
      useCustomDates ? periodoInicial!.toISOString() : null,
      useCustomDates ? periodoFinal!.toISOString() : null,
    ],
    queryFn: async () => {
      const useCase = new BuscarMetodosPagamentoDetalhadoUseCase()
      return useCase.execute(
        mappedPeriodo,
        useCustomDates ? periodoInicial! : undefined,
        useCustomDates ? periodoFinal! : undefined
      )
    },
    enabled,
    staleTime: 90_000,
    gcTime: 10 * 60_000,
  })
}
