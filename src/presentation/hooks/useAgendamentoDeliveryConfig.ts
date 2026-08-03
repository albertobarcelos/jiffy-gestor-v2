'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type {
  AgendamentoDeliveryConfigDTO,
  UpdateAgendamentoDeliveryConfigInput,
} from '@/src/application/dto/delivery/AgendamentoDeliveryDTO'
import { buscarAgendamentoDeliveryConfigUseCase } from '@/src/application/use-cases/delivery/BuscarAgendamentoDeliveryConfigUseCase'
import { salvarAgendamentoDeliveryConfigUseCase } from '@/src/application/use-cases/delivery/SalvarAgendamentoDeliveryConfigUseCase'

export const AGENDAMENTO_DELIVERY_CONFIG_QUERY_KEY = [
  'delivery',
  'agendamento-config',
] as const

export function useAgendamentoDeliveryConfig(enabled = true) {
  return useSecureTenantQuery<AgendamentoDeliveryConfigDTO | null>(
    AGENDAMENTO_DELIVERY_CONFIG_QUERY_KEY,
    async ({ token }) => buscarAgendamentoDeliveryConfigUseCase.execute(token),
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
    async ({ token }, input) =>
      salvarAgendamentoDeliveryConfigUseCase.execute(token, input),
    {
      onSuccess: async () => {
        await invalidate([...AGENDAMENTO_DELIVERY_CONFIG_QUERY_KEY])
        await queryClient.invalidateQueries({
          queryKey: AGENDAMENTO_DELIVERY_CONFIG_QUERY_KEY,
        })
      },
    }
  )
}
