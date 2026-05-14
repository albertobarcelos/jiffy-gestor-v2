import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'

export type LinhaComparacaoChartRow = {
  labelEixo: string
  finalizadasAtual: number
  canceladasAtual: number
  finalizadasAnterior: number
  canceladasAnterior: number
}

type Params = {
  periodo?: string
  timezone?: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  intervaloHora?: number
  enabled?: boolean
}

async function fetchDashboardEvolucaoComparativo(params: Params & { token: string }): Promise<LinhaComparacaoChartRow[]> {
  const search = new URLSearchParams()
  if (params.periodo) search.append('periodo', params.periodo)
  if (params.timezone) search.append('timezone', params.timezone)
  if (params.periodo === 'personalizado' && params.periodoInicial && params.periodoFinal) {
    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())
  }
  if (typeof params.intervaloHora === 'number') search.append('intervaloHora', String(params.intervaloHora))

  const response = await fetch(`/api/dashboard/evolucao-comparativo?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar evolução do dashboard'
    throw new Error(msg)
  }

  return data as unknown as LinhaComparacaoChartRow[]
}

export function useDashboardEvolucaoComparativoQuery({
  periodo,
  timezone,
  periodoInicial,
  periodoFinal,
  intervaloHora,
  enabled = true,
}: Params) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()

  return useQuery({
    queryKey: [
      'dashboard',
      'evolucao-comparativo',
      periodo,
      timezone,
      periodo === 'personalizado' && periodoInicial ? periodoInicial.toISOString() : null,
      periodo === 'personalizado' && periodoFinal ? periodoFinal.toISOString() : null,
      intervaloHora ?? null,
      empresaId,
    ],
    queryFn: () =>
      fetchDashboardEvolucaoComparativo({ periodo, timezone, periodoInicial, periodoFinal, intervaloHora, enabled, token: token! }),
    enabled: enabled && !!token,
    staleTime: 30_000,
  })
}
