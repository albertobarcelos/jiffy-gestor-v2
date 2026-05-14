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
  mesasAbertas: number
  totalCancelado: number
  ticketMedio: number
  itensPorPedido: number
}

export type DashboardResumoResponse = {
  atual: DashboardResumoMetricas
  anterior: DashboardResumoMetricas
  comparacao: {
    totalFaturado: { percentual: number; status: 'neutro' | 'sem_base' | 'positivo' | 'negativo' }
    countVendasEfetivadas: { percentual: number; status: 'neutro' | 'sem_base' | 'positivo' | 'negativo' }
    countVendasCanceladas: { percentual: number; status: 'neutro' | 'sem_base' | 'positivo' | 'negativo' }
    ticketMedio: { percentual: number; status: 'neutro' | 'sem_base' | 'positivo' | 'negativo' }
    itensPorPedido: { percentual: number; status: 'neutro' | 'sem_base' | 'positivo' | 'negativo' }
  }
}

type DashboardResumoParams = {
  periodo?: string
  timezone?: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  enabled?: boolean
}

async function fetchDashboardResumo(params: DashboardResumoParams & { token: string }): Promise<DashboardResumoResponse> {
  const search = new URLSearchParams()
  if (params.periodo) search.append('periodo', params.periodo)
  if (params.timezone) search.append('timezone', params.timezone)
  if (params.periodo === 'personalizado' && params.periodoInicial && params.periodoFinal) {
    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())
  }

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

export function useDashboardResumoQuery({ periodo, timezone, periodoInicial, periodoFinal, enabled = true }: DashboardResumoParams) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()

  return useQuery({
    queryKey: [
      'dashboard',
      'resumo',
      periodo,
      timezone,
      periodo === 'personalizado' && periodoInicial ? periodoInicial.toISOString() : null,
      periodo === 'personalizado' && periodoFinal ? periodoFinal.toISOString() : null,
      empresaId,
    ],
    queryFn: () => fetchDashboardResumo({ periodo, timezone, periodoInicial, periodoFinal, token: token! }),
    enabled: enabled && !!token,
    staleTime: 30_000,
  })
}

