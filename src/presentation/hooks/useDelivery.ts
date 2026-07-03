import { PedidoDelivery } from '@/src/domain/entities/PedidoDelivery'
import { MetodoPagamento } from '@/src/domain/entities/MetodoPagamento'
import { StatusPedido } from '@/src/domain/entities/StatusPedido'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { handleApiError, showToast } from '@/src/shared/utils/toast'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

interface ListarPedidosParams {
  status?: StatusPedido
  dataAtualizacao?: string
}

/**
 * Hook para listar pedidos de delivery (sessão de empresa da aba).
 */
export function usePedidosDelivery(params: ListarPedidosParams = {}) {
  return useSecureTenantQuery(
    ['delivery', 'pedidos', params],
    async ({ token }): Promise<PedidoDelivery[]> => {
      const searchParams = new URLSearchParams()
      if (params.status !== undefined) {
        searchParams.append('status', params.status.toString())
      }
      if (params.dataAtualizacao) {
        searchParams.append('data_atualizacao', params.dataAtualizacao)
      }

      const response = await fetchGestorApi(
        `/api/delivery/pedidos?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
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
      return (data.pedidos || []).map((p: Parameters<typeof PedidoDelivery.fromJSON>[0]) =>
        PedidoDelivery.fromJSON(p)
      )
    },
    {
      staleTime: 1000 * 30,
      refetchInterval: 1000 * 60,
    }
  )
}

/**
 * Hook para listar métodos de pagamento do delivery.
 */
export function useMetodosPagamentoDelivery() {
  return useSecureTenantQuery(
    ['delivery', 'metodos-pagamento'],
    async ({ token }): Promise<MetodoPagamento[]> => {
      const response = await fetchGestorApi('/api/delivery/metodos-pagamento', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
      return (data.formas || []).map((f: Parameters<typeof MetodoPagamento.fromJSON>[0]) =>
        MetodoPagamento.fromJSON(f)
      )
    },
    { staleTime: 1000 * 60 * 60 }
  )
}

/**
 * Hook para avançar status do pedido.
 */
export function useAvancarStatusPedido() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation(
    async ({ token }, pedidoRef: string): Promise<{ status: StatusPedido }> => {
      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      const response = await fetchGestorApi(
        `/api/delivery/pedidos/${encodeURIComponent(pedidoRef)}/avancar-status`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
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
    {
      onSuccess: async () => {
        await invalidate(['delivery', 'pedidos'])
        showToast.success('Status do pedido atualizado com sucesso!')
      },
      onError: error => {
        handleApiError(error)
      },
    }
  )
}

/**
 * Hook para cancelar pedido.
 */
export function useCancelarPedido() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation(
    async ({ token }, pedidoRef: string): Promise<{ status: StatusPedido }> => {
      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      const response = await fetchGestorApi(
        `/api/delivery/pedidos/${encodeURIComponent(pedidoRef)}/cancelar`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
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
    {
      onSuccess: async () => {
        await invalidate(['delivery', 'pedidos'])
        showToast.success('Pedido cancelado com sucesso!')
      },
      onError: error => {
        handleApiError(error)
      },
    }
  )
}

/**
 * Hook para enviar pedido para serviço de motoboy.
 */
export function useEnviarParaMotoboy() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation(
    async (
      { token },
      {
        pedidoRef,
        servico,
      }: {
        pedidoRef: string
        servico?: 'Pega Express' | 'Itz Express' | 'NextLeva'
      }
    ): Promise<void> => {
      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      const response = await fetchGestorApi(
        `/api/delivery/pedidos/${encodeURIComponent(pedidoRef)}/enviar-motoboy`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
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
    {
      onSuccess: async () => {
        await invalidate(['delivery', 'pedidos'])
        showToast.success('Pedido enviado para o serviço de motoboy!')
      },
      onError: error => {
        handleApiError(error)
      },
    }
  )
}
