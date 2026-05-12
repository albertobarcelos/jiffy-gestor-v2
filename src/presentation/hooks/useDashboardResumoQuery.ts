import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

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

async function fetchDashboardResumo(params: DashboardResumoParams & { token: string }): Promise<DashboardResumoResponse> {
  const search = new URLSearchParams()
  if (params.periodoInicial) search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
  if (params.periodoFinal) search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())

  const response = await fetch(`/api/dashboard/resumo?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar resumo do dashboard'
    throw new Error(msg)
  }

  return data as unknown as DashboardResumoResponse
}

export function useDashboardResumoQuery({ periodoInicial, periodoFinal, enabled = true }: DashboardResumoParams) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()

  return useQuery({
    queryKey: [
      'dashboard',
      'resumo',
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
      empresaId,
    ],
    queryFn: () => fetchDashboardResumo({ periodoInicial, periodoFinal, token: token! }),
    enabled: enabled && !!token,
    staleTime: 30_000,
  })
}

