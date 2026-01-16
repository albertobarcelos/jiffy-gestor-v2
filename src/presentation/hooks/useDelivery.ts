import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PedidoDelivery } from '@/src/domain/entities/PedidoDelivery'
import { MetodoPagamento } from '@/src/domain/entities/MetodoPagamento'
import { StatusPedido } from '@/src/domain/entities/StatusPedido'
import { handleApiError, showToast } from '@/src/shared/utils/toast'

interface ListarPedidosParams {
  status?: StatusPedido
  dataAtualizacao?: string
}

interface DeliveryTokens {
  bearerToken: string
  integradorToken?: string
}

/**
 * Hook para listar pedidos de delivery
 */
export function usePedidosDelivery(
  params: ListarPedidosParams = {},
  tokens?: DeliveryTokens
) {
  const queryKey = ['delivery', 'pedidos', params]

  return useQuery({
    queryKey,
    queryFn: async (): Promise<PedidoDelivery[]> => {
      if (!tokens?.bearerToken) {
        throw new Error('Token de autenticação não fornecido')
      }

      const searchParams = new URLSearchParams()
      if (params.status !== undefined) {
        searchParams.append('status', params.status.toString())
      }
      if (params.dataAtualizacao) {
        searchParams.append('data_atualizacao', params.dataAtualizacao)
      }

      const headers: HeadersInit = {
        Bearer: tokens.bearerToken,
        'Content-Type': 'application/json',
      }

      if (tokens.integradorToken) {
        headers['integrador-token'] = tokens.integradorToken
      }

      const response = await fetch(
        `/api/delivery/pedidos?${searchParams.toString()}`,
        {
          headers,
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const pedidos = (data.pedidos || []).map((p: any) =>
        PedidoDelivery.fromJSON(p)
      )

      return pedidos
    },
    enabled: !!tokens?.bearerToken,
    staleTime: 1000 * 30, // 30 segundos (pedidos mudam frequentemente)
    refetchInterval: 1000 * 60, // Refetch a cada 1 minuto
  })
}

/**
 * Hook para listar métodos de pagamento
 */
export function useMetodosPagamentoDelivery(tokens?: DeliveryTokens) {
  return useQuery({
    queryKey: ['delivery', 'metodos-pagamento'],
    queryFn: async (): Promise<MetodoPagamento[]> => {
      if (!tokens?.bearerToken) {
        throw new Error('Token de autenticação não fornecido')
      }

      const headers: HeadersInit = {
        Bearer: tokens.bearerToken,
        'Content-Type': 'application/json',
      }

      if (tokens.integradorToken) {
        headers['integrador-token'] = tokens.integradorToken
      }

      const response = await fetch('/api/delivery/metodos-pagamento', {
        headers,
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
      const metodos = (data.formas || []).map((f: any) =>
        MetodoPagamento.fromJSON(f)
      )

      return metodos
    },
    enabled: !!tokens?.bearerToken,
    staleTime: 1000 * 60 * 60, // 1 hora (métodos de pagamento mudam raramente)
  })
}

/**
 * Hook para avançar status do pedido
 */
export function useAvancarStatusPedido(tokens?: DeliveryTokens) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pedidoRef: string): Promise<{ status: StatusPedido }> => {
      if (!tokens?.bearerToken) {
        throw new Error('Token de autenticação não fornecido')
      }

      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      const headers: HeadersInit = {
        Bearer: tokens.bearerToken,
        'Content-Type': 'application/json',
      }

      if (tokens.integradorToken) {
        headers['integrador-token'] = tokens.integradorToken
      }

      const response = await fetch(
        `/api/delivery/pedidos/${encodeURIComponent(pedidoRef)}/avancar-status`,
        {
          method: 'POST',
          headers,
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return { status: data.status_pedido }
    },
    onSuccess: () => {
      // Invalida a query de pedidos para refetch
      queryClient.invalidateQueries({ queryKey: ['delivery', 'pedidos'] })
      showToast.success('Status do pedido atualizado com sucesso!')
    },
    onError: (error) => {
      handleApiError(error)
    },
  })
}

/**
 * Hook para cancelar pedido
 */
export function useCancelarPedido(tokens?: DeliveryTokens) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pedidoRef: string): Promise<{ status: StatusPedido }> => {
      if (!tokens?.bearerToken) {
        throw new Error('Token de autenticação não fornecido')
      }

      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      const headers: HeadersInit = {
        Bearer: tokens.bearerToken,
        'Content-Type': 'application/json',
      }

      if (tokens.integradorToken) {
        headers['integrador-token'] = tokens.integradorToken
      }

      const response = await fetch(
        `/api/delivery/pedidos/${encodeURIComponent(pedidoRef)}/cancelar`,
        {
          method: 'POST',
          headers,
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = await response.json()
      return { status: data.status_pedido }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery', 'pedidos'] })
      showToast.success('Pedido cancelado com sucesso!')
    },
    onError: (error) => {
      handleApiError(error)
    },
  })
}

/**
 * Hook para enviar pedido para serviço de motoboy
 */
export function useEnviarParaMotoboy(tokens?: DeliveryTokens) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      pedidoRef,
      servico,
    }: {
      pedidoRef: string
      servico?: 'Pega Express' | 'Itz Express' | 'NextLeva'
    }): Promise<void> => {
      if (!tokens?.bearerToken) {
        throw new Error('Token de autenticação não fornecido')
      }

      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      const headers: HeadersInit = {
        Bearer: tokens.bearerToken,
        'Content-Type': 'application/json',
      }

      if (tokens.integradorToken) {
        headers['integrador-token'] = tokens.integradorToken
      }

      const response = await fetch(
        `/api/delivery/pedidos/${encodeURIComponent(pedidoRef)}/enviar-motoboy`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ servico }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery', 'pedidos'] })
      showToast.success('Pedido enviado para o serviço de motoboy!')
    },
    onError: (error) => {
      handleApiError(error)
    },
  })
}

