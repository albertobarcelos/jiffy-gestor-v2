import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { useCallback, useRef } from 'react'

/**
 * Extrai o motivo de rejeição (xMotivo) do XML de retorno da SEFAZ
 */
function extrairMotivoRejeicao(xmlRetorno: string): string | null {
  if (!xmlRetorno) return null
  
  try {
    // Tentar extrair xMotivo usando regex (mais simples que parser XML completo)
    // Formato: <xMotivo>mensagem</xMotivo> ou <xMotivo>mensagem</xMotivo>
    const match = xmlRetorno.match(/<xMotivo[^>]*>(.*?)<\/xMotivo>/i)
    if (match && match[1]) {
      // Decodificar entidades HTML
      return match[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
    }
    
    // Tentar formato alternativo: <erro><xMotivo>mensagem</xMotivo></erro>
    const matchErro = xmlRetorno.match(/<erro>[\s\S]*?<xMotivo[^>]*>(.*?)<\/xMotivo>[\s\S]*?<\/erro>/i)
    if (matchErro && matchErro[1]) {
      return matchErro[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim()
    }
  } catch (error) {
    console.error('Erro ao extrair motivo de rejeição do XML:', error)
  }
  
  return null
}

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
 * Hook para criar uma nova venda do gestor (venda_gestor)
 */
export function useCreateVendaGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async (data: any) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/vendas/gestor', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.message || errorData.details || `Erro ${response.status}: ${response.statusText}`
        const error = new Error(errorMessage)
        ;(error as any).response = { data: errorData, status: response.status }
        throw error
      }

      return await response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      // Toast de sucesso é exibido no componente
    },
    onError: (error: Error) => {
      // Toast de erro é exibido no componente
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
    mutationFn: async (params: { id: string; tabelaOrigem?: 'venda' | 'venda_gestor' }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      // Vendas do gestor não precisam ser marcadas, pois já aparecem no gestor por padrão
      // Apenas vendas PDV precisam ser marcadas
      if (params.tabelaOrigem === 'venda_gestor') {
        throw new Error('Vendas do gestor não podem ser marcadas para emissão fiscal')
      }

      const response = await fetch(`/api/vendas/${params.id}/marcar-emissao-fiscal`, {
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
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', params.id] })
      showToast.success('Venda marcada para emissão fiscal!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao marcar emissão fiscal')
    },
  })
}


/**
 * Faz polling do status de emissão até chegar a um estado final.
 */
async function pollStatusEmissao(
  vendaId: string,
  endpoint: 'vendas' | 'vendas/gestor',
  token: string,
  options: { interval?: number; maxAttempts?: number } = {}
): Promise<any> {
  const { interval = 3000, maxAttempts = 40 } = options
  const baseUrl = endpoint === 'vendas'
    ? `/api/vendas/${vendaId}/status-emissao`
    : `/api/vendas/gestor/${vendaId}/status-emissao`

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, interval))

    let response: Response
    try {
      response = await fetch(baseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
    } catch {
      continue
    }

    if (response.status === 404) {
      throw new Error('Endpoint de status de emissão não encontrado')
    }

    if (!response.ok) continue

    let data: any
    try {
      data = await response.json()
    } catch {
      continue
    }

    const status = data.status

    if (status === 'EMITIDA' || status === 'REJEITADA' || status === 'CANCELADA') {
      return data
    }
  }

  throw new Error('Tempo limite excedido aguardando autorização da nota fiscal')
}

/**
 * Hook para emitir NFe (NFC-e ou NF-e) para uma venda PDV.
 * Suporta emissão assíncrona: se o backend retornar 202, faz polling até o resultado final.
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

      const tipoDocumento = modelo === 55 ? 'NFE' : 'NFCE'

      const response = await fetch(`/api/vendas/${id}/emitir-nota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipoDocumento,
          modelo,
          serie,
          ambiente,
          crt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        if (errorData.xmlRetorno) {
          const xMotivo = extrairMotivoRejeicao(errorData.xmlRetorno)
          if (xMotivo) {
            errorMessage = `Nota fiscal rejeitada: ${xMotivo}`
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (response.status === 202 || result.status === 'PENDENTE' || result.status === 'PENDENTE_AUTORIZACAO') {
        showToast.success('Nota fiscal enviada para processamento. Aguardando autorização...')
        const polledResult = await pollStatusEmissao(id, 'vendas', token)

        if (polledResult.status === 'REJEITADA') {
          const motivo = polledResult.mensagemSefaz || polledResult.codigoRejeicao
          throw new Error(motivo ? `Nota fiscal rejeitada: ${motivo}` : 'Nota fiscal rejeitada pela SEFAZ')
        }

        return polledResult
      }

      if (result.status === 'REJEITADA') {
        let errorMessage = 'Nota fiscal rejeitada pela SEFAZ'
        if (result.xmlRetorno) {
          const xMotivo = extrairMotivoRejeicao(result.xmlRetorno)
          if (xMotivo) errorMessage = `Nota fiscal rejeitada: ${xMotivo}`
        } else if (result.mensagemSefaz) {
          errorMessage = `Nota fiscal rejeitada: ${result.mensagemSefaz}`
        }
        throw new Error(errorMessage)
      }

      return result
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda', variables.id] })
      showToast.success('NFe emitida com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao emitir NFe')
    },
  })
}

/**
 * Hook para emitir NFe (NFC-e ou NF-e) para uma venda GESTOR.
 * Suporta emissão assíncrona: se o backend retornar 202, faz polling até o resultado final.
 */
export function useEmitirNfeGestor() {
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

      const tipoDocumento = modelo === 55 ? 'NFE' : 'NFCE'

      const response = await fetch(`/api/vendas/gestor/${id}/emitir-nota`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipoDocumento,
          modelo,
          serie,
          ambiente,
          crt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        let errorMessage = errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
        if (errorData.xmlRetorno) {
          const xMotivo = extrairMotivoRejeicao(errorData.xmlRetorno)
          if (xMotivo) {
            errorMessage = `Nota fiscal rejeitada: ${xMotivo}`
          }
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (response.status === 202 || result.status === 'PENDENTE' || result.status === 'PENDENTE_AUTORIZACAO') {
        showToast.success('Nota fiscal enviada para processamento. Aguardando autorização...')
        const polledResult = await pollStatusEmissao(id, 'vendas/gestor', token)

        if (polledResult.status === 'REJEITADA') {
          const motivo = polledResult.mensagemSefaz || polledResult.codigoRejeicao
          throw new Error(motivo ? `Nota fiscal rejeitada: ${motivo}` : 'Nota fiscal rejeitada pela SEFAZ')
        }

        return polledResult
      }

      return result
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] })
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda-gestor', variables.id] })

      if (data.status === 'REJEITADA') {
        const motivo = data.mensagemAmigavel || 'Nota fiscal rejeitada pela SEFAZ'
        showToast.error(motivo)
      } else if (data.status === 'EMITIDA') {
        showToast.success('NFe emitida com sucesso!')
      } else {
        showToast.success(`NFe processada (status: ${data.status})`)
      }
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao emitir NFe')
    },
  })
}

/**
 * Hook para cancelar uma venda do gestor
 */
export function useCancelarVendaGestor() {
  const { auth } = useAuthStore()
  const queryClient = useQueryClient()
  const token = auth?.getAccessToken()

  return useMutation({
    mutationFn: async ({ 
      id, 
      motivo 
    }: { 
      id: string
      motivo: string
    }) => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      if (motivo.length < 15) {
        throw new Error('Justificativa deve ter no mínimo 15 caracteres')
      }

      const response = await fetch(`/api/vendas/gestor/${id}/cancelar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ motivo }),
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
      queryClient.invalidateQueries({ queryKey: ['vendas-unificadas'] })
      queryClient.invalidateQueries({ queryKey: ['venda-gestor', variables.id] })
      showToast.success('Venda cancelada com sucesso!')
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Erro ao cancelar venda')
    },
  })
}
