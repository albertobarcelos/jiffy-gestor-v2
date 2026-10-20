import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import {
  mapRelatorioEntregasDetalhe,
  mapRelatorioEntregasListagem,
  type OrderByDirectionRelatorioEntregas,
  type OrderByFieldRelatorioEntregas,
  type RelatorioEntregasDetalheDTO,
  type RelatorioEntregasListagemResponseDTO,
} from '@/src/application/dto/RelatorioEntregasDTO'
import {
  RELATORIO_ENTREGAS_DETALHE_LIMIT_MAX,
  RELATORIO_ENTREGAS_LIMIT_MAX,
} from '@/src/infrastructure/relatorios/montarQueryRelatorioEntregas'

export type RelatorioEntregasFetchParams = {
  offset: number
  limit: number
  q?: string
  dataFinalizacaoInicio?: string
  dataFinalizacaoFim?: string
  orderByField?: OrderByFieldRelatorioEntregas
  orderByDirection?: OrderByDirectionRelatorioEntregas
}

function montarSearch(params: RelatorioEntregasFetchParams, limitMax: number): URLSearchParams {
  const offset = Math.max(0, Math.floor(Number(params.offset)) || 0)
  const limit = Math.min(limitMax, Math.max(1, Math.floor(Number(params.limit)) || 10))
  const sp = new URLSearchParams()
  sp.set('offset', String(offset))
  sp.set('limit', String(limit))
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.dataFinalizacaoInicio) sp.set('dataFinalizacaoInicio', params.dataFinalizacaoInicio)
  if (params.dataFinalizacaoFim) sp.set('dataFinalizacaoFim', params.dataFinalizacaoFim)
  if (params.orderByField) sp.set('orderByField', params.orderByField)
  if (params.orderByDirection) sp.set('orderByDirection', params.orderByDirection)
  return sp
}

async function lerErroApi(response: Response): Promise<string> {
  const err = await response.json().catch(() => ({}))
  return (
    (typeof err.error === 'string' && err.error) ||
    (typeof err.message === 'string' && err.message) ||
    `Erro ${response.status}`
  )
}

export async function fetchRelatorioEntregasPage(
  token: string,
  params: RelatorioEntregasFetchParams
): Promise<RelatorioEntregasListagemResponseDTO> {
  const sp = montarSearch(params, RELATORIO_ENTREGAS_LIMIT_MAX)
  const response = await fetchGestorApi(`/api/relatorios/entregadores/resumo-entregas?${sp.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) throw new Error(await lerErroApi(response))
  const raw = (await response.json()) as Record<string, unknown>
  return mapRelatorioEntregasListagem(raw)
}

export async function fetchRelatorioEntregasDetalhe(
  token: string,
  entregadorId: string,
  params: RelatorioEntregasFetchParams
): Promise<RelatorioEntregasDetalheDTO> {
  const id = entregadorId.trim()
  if (!id) throw new Error('entregadorId é obrigatório.')
  const sp = montarSearch(params, RELATORIO_ENTREGAS_DETALHE_LIMIT_MAX)
  const response = await fetchGestorApi(
    `/api/relatorios/entregadores/${encodeURIComponent(id)}/entregas?${sp.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!response.ok) throw new Error(await lerErroApi(response))
  const raw = (await response.json()) as Record<string, unknown>
  const detalhe = mapRelatorioEntregasDetalhe(raw)
  if (!detalhe) throw new Error('Resposta de detalhe inválida.')
  return detalhe
}

export function useRelatorioEntregas(params: RelatorioEntregasFetchParams | null) {
  return useSecureTenantQuery(
    ['relatorio-entregas', params],
    async ({ token }) => {
      if (!params) throw new Error('Filtros inválidos.')
      return fetchRelatorioEntregasPage(token, params)
    },
    {
      enabled: params != null,
      staleTime: 60_000,
    }
  )
}

export function useRelatorioEntregasDetalhe(
  entregadorId: string | null,
  params: RelatorioEntregasFetchParams | null
) {
  return useSecureTenantQuery(
    ['relatorio-entregas-detalhe', entregadorId, params],
    async ({ token }) => {
      if (!entregadorId || !params) throw new Error('Detalhe inválido.')
      return fetchRelatorioEntregasDetalhe(token, entregadorId, params)
    },
    {
      enabled: Boolean(entregadorId && params),
      staleTime: 60_000,
    }
  )
}
