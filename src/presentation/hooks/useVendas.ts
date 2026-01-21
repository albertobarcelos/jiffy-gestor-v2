import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'

interface VendasQueryParams {
  q?: string
  tipoVenda?: string
  abertoPorId?: string
  canceladoPorId?: string
  valorFinalMinimo?: number
  valorFinalMaximo?: number
  meioPagamentoId?: string
  terminalId?: string
  periodoInicial?: string
  periodoFinal?: string
  status?: string[]
  solicitarEmissaoFiscal?: boolean
  statusFiscal?: string
  limit?: number
  offset?: number
}

interface VendasResponse {
  items?: any[]
  count?: number
  data?: any[]
  total?: number
}

/**
 * Hook para buscar vendas com React Query
 * 
 * Benefícios:
 * - Cache automático
 * - Deduplicação de requisições
 * - Stale-while-revalidate
 * - Retry automático
 */
export function useVendas(params: VendasQueryParams = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  const queryKey = ['vendas', params]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<{ vendas: any[]; count: number }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      if (params.tipoVenda) searchParams.append('tipoVenda', params.tipoVenda)
      if (params.abertoPorId) searchParams.append('abertoPorId', params.abertoPorId)
      if (params.canceladoPorId) searchParams.append('canceladoPorId', params.canceladoPorId)
      if (params.valorFinalMinimo) searchParams.append('valorFinalMinimo', params.valorFinalMinimo.toString())
      if (params.valorFinalMaximo) searchParams.append('valorFinalMaximo', params.valorFinalMaximo.toString())
      if (params.meioPagamentoId) searchParams.append('meioPagamentoId', params.meioPagamentoId)
      if (params.terminalId) searchParams.append('terminalId', params.terminalId)
      if (params.periodoInicial) searchParams.append('periodoInicial', params.periodoInicial)
      if (params.periodoFinal) searchParams.append('periodoFinal', params.periodoFinal)
      if (params.status) {
        params.status.forEach((status) => searchParams.append('status', status))
      }
      if (params.solicitarEmissaoFiscal !== undefined) {
        searchParams.append('solicitarEmissaoFiscal', params.solicitarEmissaoFiscal.toString())
      }
      if (params.statusFiscal) searchParams.append('statusFiscal', params.statusFiscal)
      if (params.limit) searchParams.append('limit', params.limit.toString())
      if (params.offset) searchParams.append('offset', params.offset.toString())

      const response = await fetch(`/api/vendas?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data: VendasResponse = await response.json()

      // A API pode retornar items ou data
      const vendas = data.items || data.data || []
      const count = data.count || data.total || 0

      return {
        vendas,
        count,
      }
    },
    enabled: !!token,
    staleTime: 1000 * 30, // 30 segundos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}

/**
 * Hook para buscar uma única venda por ID usando React Query.
 * Ideal para componentes de visualização e edição.
 */
export function useVenda(id: string) {
  const { auth, isAuthenticated } = useAuthStore()
  const token = auth?.getAccessToken()

  return useQuery<any, ApiError>({
    queryKey: ['venda', id],
    queryFn: async () => {
      if (!isAuthenticated || !token) {
        throw new Error('Usuário não autenticado ou token ausente.')
      }

      const response = await fetch(`/api/vendas/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          errorData.error || errorData.message || `Erro ao carregar venda ${id}`,
          response.status,
          errorData
        )
      }

      const data = await response.json()
      return data
    },
    enabled: isAuthenticated && !!token && !!id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para criar uma nova venda
 */
export function useCreateVenda() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (data: any) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/vendas', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Erro na resposta da API:', {
          status: response.status,
          statusText: response.statusText,
          errorData: JSON.stringify(errorData, null, 2),
        })
        const errorMessage = errorData.error || errorData.message || errorData.details || `Erro ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).response = { data: errorData, status: response.status }
        throw error
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      showToast.success('Venda criada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao criar venda')
    },
  })
}

/**
 * Hook para atualizar uma venda existente
 */
export function useUpdateVenda() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/vendas/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', variables.id] })
      showToast.success('Venda atualizada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao atualizar venda')
    },
  })
}

/**
 * Hook para duplicar uma venda
 */
export function useDuplicateVenda() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/vendas/${id}/duplicar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      showToast.success('Venda duplicada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao duplicar venda')
    },
  })
}

/**
 * Hook para marcar uma venda para emissão fiscal
 */
export function useMarcarEmissaoFiscal() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/vendas/${id}/marcar-emissao-fiscal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', id] })
      showToast.success('Venda marcada para emissão fiscal!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao marcar emissão fiscal')
    },
  })
}

/**
 * Hook para emitir NFe (NFC-e ou NF-e) para uma venda
 */
export function useEmitirNfe() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ 
      id, 
      modelo, 
      serie, 
      ambiente, 
      crt 
    }: { 
      id: string
      modelo: 55 | 65
      serie: number
      ambiente: 'HOMOLOGACAO' | 'PRODUCAO'
      crt: 1 | 2 | 3
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch(`/api/vendas/${id}/emitir-nfe`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelo,
          serie,
          ambiente,
          crt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return await response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', variables.id] })
      showToast.success('NFe emitida com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao emitir NFe')
    },
  })
}
