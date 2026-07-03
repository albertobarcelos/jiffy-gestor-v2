'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type {
  RelatorioProdutosVendidosMvpParticipacaoAbcDTO,
  RelatorioProdutosVendidosMvpParticipacaoDTO,
  RelatorioProdutosVendidosMvpSerieDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import {
  buildRelatorioMvpQueryKeyPrefix,
  type RelatorioProdutosVendidosMvpInfiniteParams,
} from './useRelatorioProdutosVendidosMvpQuery'

export type RelatorioMvpBlocoQueryParams = RelatorioProdutosVendidosMvpInfiniteParams & {
  dadosBaseProntos: boolean
  enabled?: boolean
}

function appendFiltrosBloco(
  search: URLSearchParams,
  params: RelatorioMvpBlocoQueryParams,
  timezone: string
) {
  search.append('timezone', timezone)
  search.append('periodo', params.periodo)
  search.append('sort', params.sort)
  search.append('limit', '1')
  search.append('offset', '0')
  search.append('comparativo', '0')

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
}

function filtrosKeyParams(params: RelatorioMvpBlocoQueryParams, timezone: string) {
  const inicioKey = params.periodoInicial ? params.periodoInicial.toISOString() : null
  const fimKey = params.periodoFinal ? params.periodoFinal.toISOString() : null
  const grupoKey = params.grupoIds.slice().sort().join('|')
  return {
    periodo: params.periodo,
    inicioKey,
    fimKey,
    timezone,
    sort: params.sort,
    grupoKey,
    valorMin: params.valorMin,
    valorMax: params.valorMax,
    qtdMin: params.qtdMin,
    qtdMax: params.qtdMax,
    buscaNome: params.buscaNome,
  }
}

async function fetchBlocoParticipacao(
  params: RelatorioMvpBlocoQueryParams & { token: string; timezone: string }
): Promise<RelatorioProdutosVendidosMvpParticipacaoDTO> {
  const search = new URLSearchParams()
  appendFiltrosBloco(search, params, params.timezone)
  search.append('somenteParticipacao', '1')

  const response = await fetch(`/api/relatorios/produtos-vendidos/mvp?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar participação por grupo.'
    throw new Error(msg)
  }
  return data as unknown as RelatorioProdutosVendidosMvpParticipacaoDTO
}

async function fetchBlocoParticipacaoAbc(
  params: RelatorioMvpBlocoQueryParams & { token: string; timezone: string }
): Promise<RelatorioProdutosVendidosMvpParticipacaoAbcDTO> {
  const search = new URLSearchParams()
  appendFiltrosBloco(search, params, params.timezone)
  search.append('somenteParticipacaoAbc', '1')

  const response = await fetch(`/api/relatorios/produtos-vendidos/mvp?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar distribuição ABC.'
    throw new Error(msg)
  }
  return data as unknown as RelatorioProdutosVendidosMvpParticipacaoAbcDTO
}

async function fetchBlocoSerie(
  params: RelatorioMvpBlocoQueryParams & { token: string; timezone: string }
): Promise<RelatorioProdutosVendidosMvpSerieDTO> {
  const search = new URLSearchParams()
  appendFiltrosBloco(search, params, params.timezone)
  search.append('somenteSerie', '1')

  const response = await fetch(`/api/relatorios/produtos-vendidos/mvp?${search.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar evolução diária.'
    throw new Error(msg)
  }
  return data as unknown as RelatorioProdutosVendidosMvpSerieDTO
}

/** SPA: donut de grupos — só quando o painel está aberto. */
export function useRelatorioProdutosVendidosMvpParticipacaoQuery(params: RelatorioMvpBlocoQueryParams) {
  const { isAuthenticated, isRehydrated, tenantAuth } = useAuthStore()
  const token = tenantAuth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const resolvedTimezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const enabled = params.enabled !== false

  return useQuery({
    queryKey: [
      ...buildRelatorioMvpQueryKeyPrefix(empresaId, filtrosKeyParams(params, resolvedTimezone)),
      'bloco-participacao',
    ],
    queryFn: () =>
      fetchBlocoParticipacao({
        ...params,
        token: token!,
        timezone: resolvedTimezone,
      }),
    enabled:
      enabled &&
      isRehydrated &&
      isAuthenticated &&
      !!token &&
      !!empresaId &&
      !(tenantAuth?.isExpired() ?? true) &&
      params.dadosBaseProntos,
    staleTime: 30_000,
  })
}

/** SPA: distribuição ABC — só quando o modal está aberto. */
export function useRelatorioProdutosVendidosMvpParticipacaoAbcQuery(params: RelatorioMvpBlocoQueryParams) {
  const { isAuthenticated, isRehydrated, tenantAuth } = useAuthStore()
  const token = tenantAuth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const resolvedTimezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const enabled = params.enabled !== false

  return useQuery({
    queryKey: [
      ...buildRelatorioMvpQueryKeyPrefix(empresaId, filtrosKeyParams(params, resolvedTimezone)),
      'bloco-participacao-abc',
    ],
    queryFn: () =>
      fetchBlocoParticipacaoAbc({
        ...params,
        token: token!,
        timezone: resolvedTimezone,
      }),
    enabled:
      enabled &&
      isRehydrated &&
      isAuthenticated &&
      !!token &&
      !!empresaId &&
      !(tenantAuth?.isExpired() ?? true) &&
      params.dadosBaseProntos,
    staleTime: 30_000,
  })
}

/** SPA: série diária — só quando o painel está aberto (pode computar série no 1º fetch). */
export function useRelatorioProdutosVendidosMvpSerieQuery(params: RelatorioMvpBlocoQueryParams) {
  const { isAuthenticated, isRehydrated, tenantAuth } = useAuthStore()
  const token = tenantAuth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const resolvedTimezone = params.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  const enabled = params.enabled !== false

  return useQuery({
    queryKey: [
      ...buildRelatorioMvpQueryKeyPrefix(empresaId, filtrosKeyParams(params, resolvedTimezone)),
      'bloco-serie',
    ],
    queryFn: () =>
      fetchBlocoSerie({
        ...params,
        token: token!,
        timezone: resolvedTimezone,
      }),
    enabled:
      enabled &&
      isRehydrated &&
      isAuthenticated &&
      !!token &&
      !!empresaId &&
      !(tenantAuth?.isExpired() ?? true) &&
      params.dadosBaseProntos,
    staleTime: 30_000,
  })
}
