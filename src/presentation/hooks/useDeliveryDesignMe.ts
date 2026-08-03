'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import {
  buildTenantQueryKey,
  useInvalidateTenantQueries,
} from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type {
  DeliveryPublicoDesignConfigDTO,
  DeliveryPublicoDesignMeResponseDTO,
  UpdateDeliveryPublicoDesignDraftInput,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { buscarDesignDeliveryMeUseCase } from '@/src/application/use-cases/delivery-publico/design/BuscarDesignDeliveryMeUseCase'
import { salvarDraftDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/SalvarDraftDesignDeliveryUseCase'
import { publicarDesignDeliveryUseCase } from '@/src/application/use-cases/delivery-publico/design/PublicarDesignDeliveryUseCase'

export const DELIVERY_DESIGN_ME_QUERY_KEY = ['delivery', 'design-me'] as const

export function useDeliveryDesignMe(enabled = true) {
  return useSecureTenantQuery<DeliveryPublicoDesignMeResponseDTO | null>(
    DELIVERY_DESIGN_ME_QUERY_KEY,
    async ({ token }) => buscarDesignDeliveryMeUseCase.execute(token),
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

export function useSalvarDraftDesignDelivery() {
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<
    DeliveryPublicoDesignMeResponseDTO,
    UpdateDeliveryPublicoDesignDraftInput
  >(
    async ({ token }, input) =>
      salvarDraftDesignDeliveryUseCase.execute(token, input),
    {
      onSuccess: data => {
        queryClient.setQueryData(
          buildTenantQueryKey(empresaId, DELIVERY_DESIGN_ME_QUERY_KEY),
          data
        )
      },
    }
  )
}

export function usePublicarDesignDelivery() {
  const invalidate = useInvalidateTenantQueries()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<
    DeliveryPublicoDesignMeResponseDTO,
    DeliveryPublicoDesignConfigDTO | undefined
  >(
    async ({ token }, draftAtual) =>
      publicarDesignDeliveryUseCase.execute(token, draftAtual),
    {
      onSuccess: async data => {
        queryClient.setQueryData(
          buildTenantQueryKey(empresaId, DELIVERY_DESIGN_ME_QUERY_KEY),
          data
        )
        await invalidate([...DELIVERY_DESIGN_ME_QUERY_KEY])
      },
    }
  )
}
