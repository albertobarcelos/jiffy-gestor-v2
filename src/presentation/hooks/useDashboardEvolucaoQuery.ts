import { useQuery } from '@tanstack/react-query'

export type DashboardEvolucaoPoint = {
  data: string
  label: string
  valorFinalizadas: number
  valorCanceladas: number
}

type Params = {
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  selectedStatuses: string[]
  intervaloHora?: number
  enabled?: boolean
}

async function fetchDashboardEvolucao(params: Params): Promise<DashboardEvolucaoPoint[]> {
  const search = new URLSearchParams()
  if (params.periodoInicial) search.append('periodoInicial', params.periodoInicial.toISOString())
  if (params.periodoFinal) search.append('periodoFinal', params.periodoFinal.toISOString())
  if (typeof params.intervaloHora === 'number') search.append('intervaloHora', String(params.intervaloHora))

  params.selectedStatuses.forEach(status => search.append('status', status))

  const response = await fetch(`/api/dashboard/evolucao?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar evolução do dashboard'
    throw new Error(msg)
  }

  return data as unknown as DashboardEvolucaoPoint[]
}

export function useDashboardEvolucaoQuery({
  periodoInicial,
  periodoFinal,
  selectedStatuses,
  intervaloHora,
  enabled = true,
}: Params) {
  return useQuery({
    queryKey: [
      'dashboard',
      'evolucao',
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
      selectedStatuses,
      intervaloHora ?? null,
    ],
    queryFn: () =>
      fetchDashboardEvolucao({ periodoInicial, periodoFinal, selectedStatuses, intervaloHora, enabled }),
    enabled,
    staleTime: 30_000,
  })
}

