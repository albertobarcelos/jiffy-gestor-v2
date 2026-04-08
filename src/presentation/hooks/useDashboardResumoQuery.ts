import { useQuery } from '@tanstack/react-query'

type DashboardResumoMetricas = {
  total: {
    totalFaturado: number
    countVendasEfetivadas: number
    countVendasCanceladas: number
    countProdutosVendidos: number
  }
  finalizadas: {
    totalFaturado: number
    countVendasEfetivadas: number
    countVendasCanceladas: number
    countProdutosVendidos: number
  }
  canceladas: {
    totalFaturado: number
    countVendasEfetivadas: number
    countVendasCanceladas: number
    countProdutosVendidos: number
  }
}

export type DashboardResumoResponse = {
  metricas: DashboardResumoMetricas
  mesasAbertas: number
  totalCancelado: number
}

type DashboardResumoParams = {
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  enabled?: boolean
}

async function fetchDashboardResumo(params: DashboardResumoParams): Promise<DashboardResumoResponse> {
  const search = new URLSearchParams()
  if (params.periodoInicial) search.append('periodoInicial', params.periodoInicial.toISOString())
  if (params.periodoFinal) search.append('periodoFinal', params.periodoFinal.toISOString())

  const response = await fetch(`/api/dashboard/resumo?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar resumo do dashboard'
    throw new Error(msg)
  }

  return data as unknown as DashboardResumoResponse
}

export function useDashboardResumoQuery({ periodoInicial, periodoFinal, enabled = true }: DashboardResumoParams) {
  return useQuery({
    queryKey: [
      'dashboard',
      'resumo',
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
    ],
    queryFn: () => fetchDashboardResumo({ periodoInicial, periodoFinal }),
    enabled,
    staleTime: 30_000,
  })
}

