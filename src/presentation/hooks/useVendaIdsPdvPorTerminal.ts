import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { VENDAS_UNIFICADAS_PAGE_SIZE } from '@/src/presentation/hooks/useVendasUnificadas'

/**
 * Parâmetros mínimos para obter IDs de vendas PDV de um terminal.
 * Usado só para cruzar com GET /vendas/unificado (que traz fiscal, mas não terminalId).
 */
export interface VendaIdsPdvPorTerminalParams {
  terminalId: string
  /** ISO — opcional, alinha com filtro de criação do Kanban */
  periodoInicial?: string
  periodoFinal?: string
  dataFinalizacaoInicio?: string
  dataFinalizacaoFim?: string
}

function montarSearchParamsIdsPdvPorTerminal(
  params: VendaIdsPdvPorTerminalParams,
  offset: number,
  limit: number
): URLSearchParams {
  const searchParams = new URLSearchParams()
  searchParams.append('terminalId', params.terminalId)
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
 * Retorna o conjunto de IDs de vendas PDV do terminal informado.
 * Solução temporária: cruzar com a lista unificada no Kanban fiscal.
 */
export function useVendaIdsPdvPorTerminal(
  params: VendaIdsPdvPorTerminalParams,
  options?: { enabled?: boolean }
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryEnabled =
    options?.enabled !== false && !!token && !!params.terminalId.trim()

  const queryKey = ['venda-ids-pdv-terminal', params, empresaId]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Set<string>> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const pageSize = VENDAS_UNIFICADAS_PAGE_SIZE
      const ids = new Set<string>()
      const idsJaRecebidos = new Set<string>()
      let offset = 0
      let totalCountDaApi: number | null = null
      let totalPagesDaApi: number | null = null

      const maxPaginas = 500
      let pagina = 0

      while (pagina < maxPaginas) {
        pagina += 1
        const searchParams = montarSearchParamsIdsPdvPorTerminal(params, offset, pageSize)

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

        if (pagina === 1) {
          if (typeof data.count === 'number' && data.count >= 0) {
            totalCountDaApi = data.count
          }
          if (typeof data.totalPages === 'number' && data.totalPages > 0) {
            totalPagesDaApi = data.totalPages
          }
        }

        const novosIds = rawItems
          .map(item => String(item.id ?? ''))
          .filter(id => id && !idsJaRecebidos.has(id))

        if (rawItems.length > 0 && novosIds.length === 0) {
          break
        }

        for (const id of novosIds) {
          idsJaRecebidos.add(id)
          ids.add(id)
        }

        if (totalCountDaApi !== null && ids.size >= totalCountDaApi) {
          break
        }

        if (totalCountDaApi === null && totalPagesDaApi !== null && pagina >= totalPagesDaApi) {
          break
        }

        const hasNext = data.hasNext ?? false
        if (!hasNext || rawItems.length === 0 || rawItems.length < pageSize) {
          break
        }

        offset += pageSize
      }

      return ids
    },
    enabled: queryEnabled,
    refetchOnReconnect: true,
    refetchInterval: false,
  })
}
