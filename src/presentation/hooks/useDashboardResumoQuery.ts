import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

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
  /** @deprecated Prefer `intervaloAtualInicio/Fim` (mesmo cálculo que Top produtos / Top garçons). */
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  /** Intervalo atual (UTC) já resolvido no cliente com `calcularPeriodoNoFusoEmpresa` / `assumirDateComoNoFusoEmpresaParaUtc`. */
  intervaloAtualInicio?: Date | null
  intervaloAtualFim?: Date | null
  /** Período de comparação (UTC), alinhado ao card e ao gráfico. */
  intervaloComparacaoInicio?: Date | null
  intervaloComparacaoFim?: Date | null
  enabled?: boolean
}

async function fetchDashboardResumo(params: DashboardResumoParams & { token: string }): Promise<DashboardResumoResponse> {
  const search = new URLSearchParams()
  if (params.periodo) search.append('periodo', params.periodo)
  if (params.timezone) search.append('timezone', params.timezone)

  const inicioAtual =
    params.intervaloAtualInicio && params.intervaloAtualFim
      ? params.intervaloAtualInicio
      : params.periodo === 'personalizado' && params.periodoInicial && params.periodoFinal
        ? params.periodoInicial
        : null
  const fimAtual =
    params.intervaloAtualInicio && params.intervaloAtualFim
      ? params.intervaloAtualFim
      : params.periodo === 'personalizado' && params.periodoInicial && params.periodoFinal
        ? params.periodoFinal
        : null

  if (inicioAtual && fimAtual) {
    search.append('dataFinalizacaoInicial', inicioAtual.toISOString())
    search.append('dataFinalizacaoFinal', fimAtual.toISOString())
  }

  if (params.intervaloComparacaoInicio && params.intervaloComparacaoFim) {
    search.append('dataFinalizacaoInicialComparacao', params.intervaloComparacaoInicio.toISOString())
    search.append('dataFinalizacaoFinalComparacao', params.intervaloComparacaoFim.toISOString())
  }

  const response = await fetchGestorApi(`/api/dashboard/resumo?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar resumo do dashboard'
    throw new Error(msg)
  }

  return data as unknown as DashboardResumoResponse
}

export function useDashboardResumoQuery({
  periodo,
  timezone,
  periodoInicial,
  periodoFinal,
  intervaloAtualInicio,
  intervaloAtualFim,
  intervaloComparacaoInicio,
  intervaloComparacaoFim,
  enabled = true,
}: DashboardResumoParams) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()

  return useQuery({
    queryKey: [
      'dashboard',
      'resumo',
      periodo,
      timezone,
      intervaloAtualInicio ? intervaloAtualInicio.toISOString() : null,
      intervaloAtualFim ? intervaloAtualFim.toISOString() : null,
      intervaloComparacaoInicio ? intervaloComparacaoInicio.toISOString() : null,
      intervaloComparacaoFim ? intervaloComparacaoFim.toISOString() : null,
      periodo === 'personalizado' && periodoInicial ? periodoInicial.toISOString() : null,
      periodo === 'personalizado' && periodoFinal ? periodoFinal.toISOString() : null,
      empresaId,
    ],
    queryFn: () =>
      fetchDashboardResumo({
        periodo,
        timezone,
        periodoInicial,
        periodoFinal,
        intervaloAtualInicio,
        intervaloAtualFim,
        intervaloComparacaoInicio,
        intervaloComparacaoFim,
        token: token!,
      }),
    enabled: enabled && !!token,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

