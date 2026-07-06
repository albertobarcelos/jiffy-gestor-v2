import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import type {
  ComissaoPdvItemDTO,
  ComissoesPdvListagemResponseDTO,
  OrderByDirectionComissoes,
  OrderByFieldComissoes,
} from '@/src/application/dto/ComissoesPdvDTO'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

/** Máximo aceito pelo fiscal em `GET .../comissoes` (validação: "Number must be less than or equal to 100"). */
export const COMISSOES_PDV_API_LIMIT_MAX = 100

export type ComissoesPdvFetchParams = {
  taxaId: string
  offset: number
  limit: number
  q?: string
  dataCriacaoInicio?: string
  dataCriacaoFim?: string
  dataFinalizacaoInicio?: string
  dataFinalizacaoFim?: string
  orderByField?: OrderByFieldComissoes
  orderByDirection?: OrderByDirectionComissoes
}

function num(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function mapItem(raw: unknown): ComissaoPdvItemDTO | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    usuarioPdvId: String(o.usuarioPdvId ?? ''),
    nomeUsuarioPdv: String(o.nomeUsuarioPdv ?? ''),
    valorTotalVendasParticipadas: num(o.valorTotalVendasParticipadas),
    valorBaseTaxaUsuario: num(o.valorBaseTaxaUsuario),
    countVendasParticipadas: num(o.countVendasParticipadas),
    valorTotalComissao: num(o.valorTotalComissao),
  }
}

export function mapComissoesPdvResponse(data: Record<string, unknown>): ComissoesPdvListagemResponseDTO {
  const itemsRaw = data.items
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map(mapItem).filter((x): x is ComissaoPdvItemDTO => x !== null)
    : []

  return {
    count: typeof data.count === 'number' ? data.count : undefined,
    page: typeof data.page === 'number' ? data.page : undefined,
    limit: typeof data.limit === 'number' ? data.limit : undefined,
    totalPages: typeof data.totalPages === 'number' ? data.totalPages : undefined,
    hasNext: typeof data.hasNext === 'boolean' ? data.hasNext : undefined,
    hasPrevious: typeof data.hasPrevious === 'boolean' ? data.hasPrevious : undefined,
    items,
  }
}

/**
 * Uma página do relatório de comissões (BFF `/api/relatorios/usuarios-pdv/comissoes`).
 * Reutilizável no hook e em agregações (ex.: todas as taxas percentuais).
 */
export async function fetchComissoesPdvPage(
  token: string,
  params: ComissoesPdvFetchParams
): Promise<ComissoesPdvListagemResponseDTO> {
  const id = params.taxaId.trim()
  if (!id) {
    throw new Error('taxaId é obrigatório.')
  }

  const offset = Math.max(0, Math.floor(Number(params.offset)) || 0)
  const limit = Math.min(
    COMISSOES_PDV_API_LIMIT_MAX,
    Math.max(1, Math.floor(Number(params.limit)) || 10)
  )

  const sp = new URLSearchParams()
  sp.set('taxaId', id)
  sp.set('offset', String(offset))
  sp.set('limit', String(limit))
  if (params.q?.trim()) sp.set('q', params.q.trim())
  if (params.dataCriacaoInicio) sp.set('dataCriacaoInicio', params.dataCriacaoInicio)
  if (params.dataCriacaoFim) sp.set('dataCriacaoFim', params.dataCriacaoFim)
  if (params.dataFinalizacaoInicio) sp.set('dataFinalizacaoInicio', params.dataFinalizacaoInicio)
  if (params.dataFinalizacaoFim) sp.set('dataFinalizacaoFim', params.dataFinalizacaoFim)
  if (params.orderByField) sp.set('orderByField', params.orderByField)
  if (params.orderByDirection) sp.set('orderByDirection', params.orderByDirection)

  const response = await fetchGestorApi(`/api/relatorios/usuarios-pdv/comissoes?${sp.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
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
  return mapComissoesPdvResponse(raw)
}

const COMISSOES_PDV_FETCH_ALL_MAX_PAGES = 500

/**
 * Busca todas as páginas do relatório para uma taxa (`limit` fixo no máximo fiscal),
 * para agregação “todas as taxas” no front.
 */
export async function fetchComissoesPdvAllItemsForTaxa(
  token: string,
  base: Omit<ComissoesPdvFetchParams, 'offset' | 'limit'>
): Promise<ComissoesPdvListagemResponseDTO> {
  const pageSize = COMISSOES_PDV_API_LIMIT_MAX
  const items: ComissaoPdvItemDTO[] = []
  let offset = 0
  let lastCount: number | undefined
  let incompleto = false

  for (let page = 0; page < COMISSOES_PDV_FETCH_ALL_MAX_PAGES; page++) {
    const res = await fetchComissoesPdvPage(token, {
      ...base,
      offset,
      limit: pageSize,
    })
    lastCount = res.count
    const chunk = res.items ?? []
    items.push(...chunk)

    if (!res.hasNext) {
      return {
        items,
        count: typeof lastCount === 'number' ? lastCount : items.length,
        hasNext: false,
        hasPrevious: false,
      }
    }

    offset += pageSize

    if (chunk.length === 0) {
      break
    }

    if (page === COMISSOES_PDV_FETCH_ALL_MAX_PAGES - 1) {
      incompleto = true
      break
    }
  }

  return {
    items,
    count: typeof lastCount === 'number' ? lastCount : items.length,
    hasNext: incompleto,
    hasPrevious: false,
  }
}

/**
 * Relatório de comissões por usuário PDV (`taxaId` obrigatório na chamada à API; o componente pode agregar várias taxas).
 */
export function useComissoesPdv(params: ComissoesPdvFetchParams | null) {
  return useSecureTenantQuery(
    ['comissoes-pdv', params],
    async ({ token }): Promise<ComissoesPdvListagemResponseDTO> => {
      if (!params?.taxaId?.trim()) {
        throw new Error('Sessão ou taxa inválida.')
      }
      return fetchComissoesPdvPage(token, params)
    },
    {
      enabled: Boolean(params?.taxaId?.trim()),
      staleTime: 60_000,
    }
  )
}
