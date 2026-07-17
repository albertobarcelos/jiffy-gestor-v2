'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import type {
  AgendamentoDeliveryConfigDTO,
  UpdateAgendamentoDeliveryConfigInput,
} from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'

export const AGENDAMENTO_DELIVERY_CONFIG_QUERY_KEY = [
  'delivery',
  'agendamento-config',
] as const

async function parseJsonOrThrow(res: Response): Promise<unknown> {
  const raw: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      textoErroCorpoApi(raw) ||
      (raw &&
      typeof raw === 'object' &&
      'error' in raw &&
      typeof (raw as { error: unknown }).error === 'string'
        ? (raw as { error: string }).error
        : '') ||
      `Erro HTTP ${res.status}`
    throw new Error(msg)
  }
  return raw
}

export function useAgendamentoDeliveryConfig(enabled = true) {
  return useSecureTenantQuery<AgendamentoDeliveryConfigDTO | null>(
    AGENDAMENTO_DELIVERY_CONFIG_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/agendamento', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) return null
      const data = await parseJsonOrThrow(res)
      return data as AgendamentoDeliveryConfigDTO
    },
    {
      enabled,
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error.message.includes('404')) return false
        return failureCount < 1
      },
    }
  )
}

export function useSalvarAgendamentoDeliveryConfig() {
  const invalidate = useInvalidateTenantQueries()
  const queryClient = useQueryClient()

  return useSecureTenantMutation<
    AgendamentoDeliveryConfigDTO,
    UpdateAgendamentoDeliveryConfigInput
  >(
    async ({ token }, input) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/agendamento', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      const data = await parseJsonOrThrow(res)
      return data as AgendamentoDeliveryConfigDTO
    },
    {
      onSuccess: async () => {
        await invalidate(AGENDAMENTO_DELIVERY_CONFIG_QUERY_KEY)
        await queryClient.invalidateQueries({
          queryKey: ['public-delivery', 'disponibilidade'],
        })
        await queryClient.invalidateQueries({
          queryKey: ['public-delivery', 'horario-funcionamento'],
        })
      },
    }
  )
}
