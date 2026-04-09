import { useQuery } from '@tanstack/react-query'

import type { DashboardEvolucaoPoint } from '@/src/presentation/hooks/useDashboardEvolucaoQuery'

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Converte pontos da evolução diária em mapa yyyy-MM-dd → faturamento (vendas finalizadas).
 */
export function pontosEvolucaoParaMapaFaturamentoPorDia(pontos: DashboardEvolucaoPoint[]): Record<string, number> {
  const mapa: Record<string, number> = {}
  for (const p of pontos) {
    if (typeof p.data === 'string' && ISO_DIA.test(p.data)) {
      mapa[p.data] = p.valorFinalizadas
    }
  }
  return mapa
}

type Params = {
  periodoInicial: Date
  periodoFinal: Date
  enabled?: boolean
}

async function fetchFaturamentoPorDia(params: Params): Promise<Record<string, number>> {
  const search = new URLSearchParams()
  search.append('periodoInicial', params.periodoInicial.toISOString())
  search.append('periodoFinal', params.periodoFinal.toISOString())
  search.append('status', 'FINALIZADA')

  const response = await fetch(`/api/dashboard/evolucao?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar faturamento por dia'
    throw new Error(msg)
  }

  const pontos = data as unknown as DashboardEvolucaoPoint[]
  if (!Array.isArray(pontos)) {
    return {}
  }
  return pontosEvolucaoParaMapaFaturamentoPorDia(pontos)
}

/**
 * Faturamento agregado por dia (vendas FINALIZADAS) para o calendário de intervalo.
 * Reutiliza GET /api/dashboard/evolucao com bucket diário (período amplo → sem agrupamento por hora).
 */
export function useDashboardFaturamentoPorDiaQuery({
  periodoInicial,
  periodoFinal,
  enabled = true,
}: Params) {
  return useQuery({
    queryKey: [
      'dashboard',
      'faturamento-por-dia',
      periodoInicial.toISOString(),
      periodoFinal.toISOString(),
    ],
    queryFn: () => fetchFaturamentoPorDia({ periodoInicial, periodoFinal }),
    enabled,
    staleTime: 30_000,
  })
}
