import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type {
  CoberturaRelatorioItemDTO,
  OrderByDirectionRelatorioEntregadores,
  OrderByFieldRelatorioEntregadores,
  RelatorioEntregadoresItemDTO,
  RelatorioEntregadoresResponseDTO,
  RelatorioEntregadoresTotaisDTO,
  EntregadorRelatorioOpcaoDTO,
} from '@/src/application/dto/RelatorioEntregadoresDTO'

export type RelatorioEntregadoresFetchParams = {
  dataFinalizacaoInicio: string
  dataFinalizacaoFim: string
  offset: number
  limit: number
  q?: string
  entregadorId?: string
  coberturaId?: string
  orderByField?: OrderByFieldRelatorioEntregadores
  orderByDirection?: OrderByDirectionRelatorioEntregadores
}

function num(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function mapItem(raw: unknown): RelatorioEntregadoresItemDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.entregadorId ?? '').trim()
  if (!id) return null
  return {
    entregadorId: id,
    nome: String(o.nome ?? '—'),
    telefone: o.telefone != null ? String(o.telefone) : null,
    quantidadeEntregasFinalizadas: num(o.quantidadeEntregasFinalizadas),
    quantidadeEntregasPendentes: num(o.quantidadeEntregasPendentes),
    valorAReceberFinalizadas: num(o.valorAReceberFinalizadas),
    valorAReceberPendentes: num(o.valorAReceberPendentes),
    valorAReceber: num(o.valorAReceber),
  }
}

function mapEntregadorOpcao(raw: unknown): EntregadorRelatorioOpcaoDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  if (!id) return null
  return { id, nome: String(o.nome ?? '—').trim() || '—' }
}

function mapCobertura(raw: unknown): CoberturaRelatorioItemDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = String(o.id ?? '').trim()
  const tipo = o.tipo === 'raio' ? 'raio' : o.tipo === 'area' ? 'area' : null
  if (!id || !tipo) return null
  return {
    id,
    tipo,
    nome: String(o.nome ?? ''),
    valorTaxa: num(o.valorTaxa),
  }
}

export function mapRelatorioEntregadoresResponse(
  data: Record<string, unknown>
): RelatorioEntregadoresResponseDTO {
  const itemsRaw = data.items
  const coberturasRaw = data.coberturas
  const entregadoresRaw = data.entregadores
  const totaisRaw = data.totais && typeof data.totais === 'object' ? (data.totais as Record<string, unknown>) : {}

  const totais: RelatorioEntregadoresTotaisDTO = {
    quantidadeEntregasFinalizadas: num(totaisRaw.quantidadeEntregasFinalizadas),
    quantidadeEntregasPendentes: num(totaisRaw.quantidadeEntregasPendentes),
    valorAReceberFinalizadas: num(totaisRaw.valorAReceberFinalizadas),
    valorAReceberPendentes: num(totaisRaw.valorAReceberPendentes),
    valorAReceber: num(totaisRaw.valorAReceber),
    quantidadeSemCobertura: num(totaisRaw.quantidadeSemCobertura),
  }

  return {
    items: Array.isArray(itemsRaw)
      ? itemsRaw.map(mapItem).filter((x): x is RelatorioEntregadoresItemDTO => x !== null)
      : [],
    coberturas: Array.isArray(coberturasRaw)
      ? coberturasRaw.map(mapCobertura).filter((x): x is CoberturaRelatorioItemDTO => x !== null)
      : [],
    entregadores: Array.isArray(entregadoresRaw)
      ? entregadoresRaw
          .map(mapEntregadorOpcao)
          .filter((x): x is EntregadorRelatorioOpcaoDTO => x !== null)
      : [],
    totais,
    count: typeof data.count === 'number' ? data.count : 0,
    hasNext: data.hasNext === true,
    hasPrevious: data.hasPrevious === true,
    truncado: data.truncado === true,
  }
}

export async function fetchRelatorioEntregadores(
  token: string,
  params: RelatorioEntregadoresFetchParams
): Promise<RelatorioEntregadoresResponseDTO> {
  const sp = new URLSearchParams()
  sp.set('dataFinalizacaoInicio', params.dataFinalizacaoInicio)
  sp.set('dataFinalizacaoFim', params.dataFinalizacaoFim)
  sp.set('offset', String(Math.max(0, params.offset)))
  sp.set('limit', String(Math.min(100, Math.max(1, params.limit))))
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.entregadorId?.trim()) sp.set('entregadorId', params.entregadorId.trim())
  if (params.coberturaId?.trim()) sp.set('coberturaId', params.coberturaId.trim())
  if (params.orderByField) sp.set('orderByField', params.orderByField)
  if (params.orderByDirection) sp.set('orderByDirection', params.orderByDirection)

  const response = await fetchGestorApi(`/api/relatorios/entregadores?${sp.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const msg =
      (typeof err.error === 'string' && err.error) ||
      (typeof err.message === 'string' && err.message) ||
      `Erro ${response.status}`
    throw new Error(msg)
  }

  const raw = (await response.json()) as Record<string, unknown>
  return mapRelatorioEntregadoresResponse(raw)
}

export function useRelatorioEntregadores(params: RelatorioEntregadoresFetchParams | null) {
  return useSecureTenantQuery(
    ['relatorio-entregadores', params],
    async ({ token }) => {
      if (!params) throw new Error('Filtro inválido.')
      return fetchRelatorioEntregadores(token, params)
    },
    {
      enabled: Boolean(params?.dataFinalizacaoInicio && params.dataFinalizacaoFim),
      staleTime: 60_000,
    }
  )
}
