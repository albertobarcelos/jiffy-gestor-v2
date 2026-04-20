import { useQuery } from '@tanstack/react-query'

import type { DashboardEvolucaoPoint } from '@/src/presentation/hooks/useDashboardEvolucaoQuery'

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Extrai yyyy-MM-dd do campo `data` da evolução.
 * A rota `/api/dashboard/evolucao` pode devolver bucket diário (`2026-04-20`) ou por hora (`2026-04-20 14:30`).
 */
function extrairIsoDiaDoPontoEvolucao(data: string): string | null {
  const trimmed = data.trim()
  if (ISO_DIA.test(trimmed)) return trimmed
  const antesDoEspaco = trimmed.split(/\s+/)[0] ?? ''
  return ISO_DIA.test(antesDoEspaco) ? antesDoEspaco : null
}

/**
 * Converte pontos da evolução em mapa yyyy-MM-dd → faturamento (vendas finalizadas), somando buckets por hora no mesmo dia.
 */
export function pontosEvolucaoParaMapaFaturamentoPorDia(pontos: DashboardEvolucaoPoint[]): Record<string, number> {
  const mapa: Record<string, number> = {}
  for (const p of pontos) {
    if (typeof p.data !== 'string') continue
    const dia = extrairIsoDiaDoPontoEvolucao(p.data)
    if (!dia) continue
    const v =
      typeof p.valorFinalizadas === 'number' && Number.isFinite(p.valorFinalizadas) ? p.valorFinalizadas : 0
    mapa[dia] = (mapa[dia] ?? 0) + v
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
 * Reutiliza GET /api/dashboard/evolucao; se a rota vier com buckets por hora, agregamos no cliente por yyyy-MM-dd.
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
