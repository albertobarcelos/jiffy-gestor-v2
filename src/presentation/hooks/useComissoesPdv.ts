import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import type {
  ComissaoPdvItemDTO,
  ComissoesPdvListagemResponseDTO,
  OrderByDirectionComissoes,
  OrderByFieldComissoes,
} from '@/src/application/dto/ComissoesPdvDTO'

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

function mapResponse(data: Record<string, unknown>): ComissoesPdvListagemResponseDTO {
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
 * Relatório de comissões por usuário PDV (taxa percentual obrigatória no backend).
 */
export function useComissoesPdv(params: ComissoesPdvFetchParams | null) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const enabled = Boolean(token && params?.taxaId?.trim())

  return useQuery({
    queryKey: ['comissoes-pdv', params],
    queryFn: async (): Promise<ComissoesPdvListagemResponseDTO> => {
      if (!token || !params?.taxaId?.trim()) {
        throw new Error('Sessão ou taxa inválida.')
      }

      const sp = new URLSearchParams()
      sp.set('taxaId', params.taxaId.trim())
      sp.set('offset', String(params.offset))
      sp.set('limit', String(params.limit))
      if (params.q?.trim()) sp.set('q', params.q.trim())
      if (params.dataCriacaoInicio) sp.set('dataCriacaoInicio', params.dataCriacaoInicio)
      if (params.dataCriacaoFim) sp.set('dataCriacaoFim', params.dataCriacaoFim)
      if (params.dataFinalizacaoInicio)
        sp.set('dataFinalizacaoInicio', params.dataFinalizacaoInicio)
      if (params.dataFinalizacaoFim) sp.set('dataFinalizacaoFim', params.dataFinalizacaoFim)
      if (params.orderByField) sp.set('orderByField', params.orderByField)
      if (params.orderByDirection) sp.set('orderByDirection', params.orderByDirection)

      const response = await fetch(`/api/relatorios/usuarios-pdv/comissoes?${sp.toString()}`, {
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
      return mapResponse(raw)
    },
    enabled,
    staleTime: 60_000,
  })
}
