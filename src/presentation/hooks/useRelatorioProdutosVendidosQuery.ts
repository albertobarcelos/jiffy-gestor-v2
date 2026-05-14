'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type {
  RelatorioProdutosVendidosResponseDTO,
  RelatorioProdutosVendidosSort,
} from '@/src/shared/types/relatoriosProdutosVendidosApi'

export type RelatorioProdutosVendidosQueryParams = {
  periodo: string
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  timezone?: string
  sort: RelatorioProdutosVendidosSort
  grupoIds: string[]
  valorMin: string
  valorMax: string
  qtdMin: string
  qtdMax: string
  buscaNome: string
  limit: number
  offset: number
  mockMargem: boolean
  enabled?: boolean
}

async function fetchRelatorio(
  params: RelatorioProdutosVendidosQueryParams & { token: string; timezone: string }
): Promise<RelatorioProdutosVendidosResponseDTO> {
  const search = new URLSearchParams()
  search.append('periodo', params.periodo)
  search.append('timezone', params.timezone)
  search.append('sort', params.sort)
  search.append('limit', String(params.limit))
  search.append('offset', String(params.offset))
  if (params.periodoInicial && params.periodoFinal) {
    search.append('dataFinalizacaoInicial', params.periodoInicial.toISOString())
    search.append('dataFinalizacaoFinal', params.periodoFinal.toISOString())
  }
  if (params.grupoIds.length > 0) {
    search.append('grupoIds', params.grupoIds.join(','))
  }
  const vmin = params.valorMin.trim()
  const vmax = params.valorMax.trim()
  const qmin = params.qtdMin.trim()
  const qmax = params.qtdMax.trim()
  if (vmin) search.append('valorMin', vmin)
  if (vmax) search.append('valorMax', vmax)
  if (qmin) search.append('qtdMin', qmin)
  if (qmax) search.append('qtdMax', qmax)
  const q = params.buscaNome.trim()
  if (q) search.append('q', q)
  if (params.mockMargem) search.append('mock', '1')

  const response = await fetch(`/api/relatorios/produtos-vendidos?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar relatório de produtos.'
    throw new Error(msg)
  }
  return data as unknown as RelatorioProdutosVendidosResponseDTO
}

export function useRelatorioProdutosVendidosQuery(params: RelatorioProdutosVendidosQueryParams) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const resolvedTimezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const enabled = params.enabled !== false

  const inicioKey = params.periodoInicial ? params.periodoInicial.toISOString() : null
  const fimKey = params.periodoFinal ? params.periodoFinal.toISOString() : null
  const grupoKey = params.grupoIds.slice().sort().join('|')

  return useQuery<RelatorioProdutosVendidosResponseDTO>({
    queryKey: [
      'relatorios',
      'produtos-vendidos',
      params.periodo,
      inicioKey,
      fimKey,
      resolvedTimezone,
      params.sort,
      grupoKey,
      params.valorMin,
      params.valorMax,
      params.qtdMin,
      params.qtdMax,
      params.buscaNome,
      params.limit,
      params.offset,
      params.mockMargem,
      empresaId,
    ],
    queryFn: () =>
      fetchRelatorio({
        ...params,
        token: token!,
        timezone: resolvedTimezone,
      }),
    enabled: enabled && !!token,
    staleTime: 30_000,
  })
}
