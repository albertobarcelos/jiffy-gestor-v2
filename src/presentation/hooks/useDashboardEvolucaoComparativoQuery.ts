import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { LinhaComparacaoChartRow } from '@/src/infrastructure/dashboard/dashboardEvolucaoComparativoCache'

export type { LinhaComparacaoChartRow }

type Params = {
  periodo?: string
  timezone?: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  intervaloHora?: number
  enabled?: boolean
}

function appendParamsEvolucao(search: URLSearchParams, params: Params) {
  if (params.periodo) search.append('periodo', params.periodo)
  if (params.timezone) search.append('timezone', params.timezone)
  if (params.periodo === 'personalizado' && params.periodoInicial && params.periodoFinal) {
    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())
  }
  if (typeof params.intervaloHora === 'number') {
    search.append('intervaloHora', String(params.intervaloHora))
  }
}

async function fetchDashboardEvolucaoComparativo(
  params: Params & { token: string; somenteComparativo?: boolean }
): Promise<LinhaComparacaoChartRow[]> {
  const search = new URLSearchParams()
  appendParamsEvolucao(search, params)
  if (params.somenteComparativo) {
    search.append('somenteComparativo', '1')
  } else {
    search.append('comparativo', '0')
  }

  const response = await fetchGestorApi(`/api/dashboard/evolucao-comparativo?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar evolução do dashboard'
    throw new Error(msg)
  }

  return data as unknown as LinhaComparacaoChartRow[]
}

function buildEvolucaoQueryKeyPrefix(
  empresaId: string | null,
  params: {
    periodo?: string
    timezone?: string
    periodoInicial?: Date | null
    periodoFinal?: Date | null
    intervaloHora?: number
  }
) {
  return [
    'dashboard',
    'evolucao-comparativo',
    params.periodo,
    params.timezone,
    params.periodo === 'personalizado' && params.periodoInicial ? params.periodoInicial.toISOString() : null,
    params.periodo === 'personalizado' && params.periodoFinal ? params.periodoFinal.toISOString() : null,
    params.intervaloHora ?? null,
    empresaId,
  ] as const
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
    queryKey: [...buildEvolucaoQueryKeyPrefix(empresaId, { periodo, timezone, periodoInicial, periodoFinal, intervaloHora })],
    queryFn: () =>
      fetchDashboardEvolucaoComparativo({
        periodo,
        timezone,
        periodoInicial,
        periodoFinal,
        intervaloHora,
        token: token!,
      }),
    enabled: enabled && !!token,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

/** 2ª fase: série do período anterior (após o gráfico base ter carregado). */
export function useDashboardEvolucaoComparativoAnteriorQuery(
  params: Params & { dadosBaseProntos: boolean }
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const enabled = params.enabled !== false

  return useQuery({
    queryKey: [
      ...buildEvolucaoQueryKeyPrefix(empresaId, params),
      'comparativo',
    ],
    queryFn: () =>
      fetchDashboardEvolucaoComparativo({
        periodo: params.periodo,
        timezone: params.timezone,
        periodoInicial: params.periodoInicial,
        periodoFinal: params.periodoFinal,
        intervaloHora: params.intervaloHora,
        token: token!,
        somenteComparativo: true,
      }),
    enabled: enabled && !!token && params.dadosBaseProntos,
    staleTime: 30_000,
  })
}
