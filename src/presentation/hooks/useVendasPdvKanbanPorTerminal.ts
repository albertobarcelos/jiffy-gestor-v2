import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import {
  mapVendaPdvJsonParaVendaUnificadaDTO,
  VENDAS_UNIFICADAS_PAGE_SIZE,
  VendaUnificadaDTO,
} from '@/src/presentation/hooks/useVendasUnificadas'

/** Parâmetros alinhados aos filtros do Kanban fiscal + `terminalId` obrigatório. */
export interface VendasPdvKanbanQueryParams {
  terminalId: string
  q?: string
  statusFiscal?: string
  /** ISO — mapeado para `dataCriacaoInicial` no GET /operacao-pdv/vendas */
  periodoInicial?: string
  /** ISO — mapeado para `dataCriacaoFinal` */
  periodoFinal?: string
  /** ISO — mapeado para `dataFinalizacaoInicial` */
  dataFinalizacaoInicio?: string
  /** ISO — mapeado para `dataFinalizacaoFinal` */
  dataFinalizacaoFim?: string
}

export interface VendasPdvKanbanResponse {
  count: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  items: VendaUnificadaDTO[]
}

function montarSearchParamsVendasPdvKanban(
  params: VendasPdvKanbanQueryParams,
  offset: number,
  limit: number
): URLSearchParams {
  const searchParams = new URLSearchParams()
  searchParams.append('terminalId', params.terminalId)
  if (params.q?.trim()) searchParams.append('q', params.q.trim())
  if (params.statusFiscal) searchParams.append('statusFiscal', params.statusFiscal)
  if (params.periodoInicial) searchParams.append('dataCriacaoInicial', params.periodoInicial)
  if (params.periodoFinal) searchParams.append('dataCriacaoFinal', params.periodoFinal)
  if (params.dataFinalizacaoInicio)
    searchParams.append('dataFinalizacaoInicial', params.dataFinalizacaoInicio)
  if (params.dataFinalizacaoFim)
    searchParams.append('dataFinalizacaoFinal', params.dataFinalizacaoFim)
  searchParams.append('status', 'FINALIZADA')
  searchParams.append('status', 'CANCELADA')
  searchParams.append('offset', String(offset))
  searchParams.append('limit', String(limit))
  return searchParams
}

/**
 * Busca vendas PDV por terminal (GET /operacao-pdv/vendas) paginando até o fim.
 * Uso temporário no Kanban fiscal quando o filtro de terminal está ativo.
 */
export function useVendasPdvKanbanPorTerminal(
  params: VendasPdvKanbanQueryParams,
  options?: { enabled?: boolean }
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryEnabled =
    options?.enabled !== false && !!token && !!params.terminalId.trim()

  const queryKey = ['vendas-pdv-kanban-terminal', params, empresaId]

  return useQuery({
    queryKey,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<VendasPdvKanbanResponse> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const pageSize = VENDAS_UNIFICADAS_PAGE_SIZE
      const todosItens: VendaUnificadaDTO[] = []
      const idsJaRecebidos = new Set<string>()
      let offset = 0
      let totalCountDaApi: number | null = null
      let totalPagesDaApi: number | null = null
      let primeiraPaginaMeta: {
        page: number
        totalPages: number
        hasPrevious: boolean
      } | null = null

      const maxPaginas = 500
      let pagina = 0

      while (pagina < maxPaginas) {
        pagina += 1
        const searchParams = montarSearchParamsVendasPdvKanban(params, offset, pageSize)

        const response = await fetchGestorApi(`/api/vendas?${searchParams.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage =
            errorData.error ||
            errorData.message ||
            `Erro ${response.status}: ${response.statusText}`
          throw new Error(errorMessage)
        }

        const data = await response.json()
        const rawItems = (data.items || []) as Record<string, unknown>[]
        const batch = rawItems.map(mapVendaPdvJsonParaVendaUnificadaDTO)

        if (pagina === 1) {
          if (typeof data.count === 'number' && data.count >= 0) {
            totalCountDaApi = data.count
          }
          if (typeof data.totalPages === 'number' && data.totalPages > 0) {
            totalPagesDaApi = data.totalPages
          }
          primeiraPaginaMeta = {
            page: data.page ?? 1,
            totalPages: data.totalPages ?? 1,
            hasPrevious: data.hasPrevious ?? false,
          }
        }

        const novosNaPagina =
          batch.length > 0 ? batch.filter(item => !idsJaRecebidos.has(item.id)) : []

        if (batch.length > 0 && novosNaPagina.length === 0) {
          break
        }

        for (const item of novosNaPagina) {
          idsJaRecebidos.add(item.id)
        }
        todosItens.push(...novosNaPagina)

        if (totalCountDaApi !== null && todosItens.length >= totalCountDaApi) {
          break
        }

        if (totalCountDaApi === null && totalPagesDaApi !== null && pagina >= totalPagesDaApi) {
          break
        }

        const hasNext = data.hasNext ?? false
        if (!hasNext || batch.length === 0 || batch.length < pageSize) {
          break
        }

        offset += pageSize
      }

      return {
        items: todosItens,
        count: totalCountDaApi !== null ? totalCountDaApi : todosItens.length,
        page: primeiraPaginaMeta?.page ?? 1,
        limit: todosItens.length,
        totalPages: primeiraPaginaMeta?.totalPages ?? 1,
        hasNext: false,
        hasPrevious: primeiraPaginaMeta?.hasPrevious ?? false,
      }
    },
    enabled: queryEnabled,
    refetchOnReconnect: true,
    refetchInterval: false,
  })
}
