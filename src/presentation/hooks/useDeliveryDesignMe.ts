'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type {
  DeliveryPublicoDesignConfigDTO,
  DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import {
  buscarDesignDeliveryMeUseCase,
  limparBannerEmpresaDeliveryUseCase,
  limparLogoEmpresaDeliveryUseCase,
  publicarDesignDeliveryUseCase,
  salvarDraftDesignDeliveryUseCase,
} from '@/src/infrastructure/composition/deliveryDesignUseCases'

export const DELIVERY_DESIGN_ME_QUERY_KEY = ['delivery', 'design-me'] as const

export function useDeliveryDesignMe(enabled = true) {
  return useSecureTenantQuery<DeliveryPublicoDesignMeResponseDTO>(
    DELIVERY_DESIGN_ME_QUERY_KEY,
    async ({ token }) => buscarDesignDeliveryMeUseCase.execute(token),
    {
      enabled,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useSalvarDraftDesignDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    DeliveryPublicoDesignMeResponseDTO,
    DeliveryPublicoDesignConfigDTO
  >(
    async ({ token }, body) => salvarDraftDesignDeliveryUseCase.execute(token, body),
    {
      onSuccess: async () => {
        await invalidate(DELIVERY_DESIGN_ME_QUERY_KEY)
      },
    }
  )
}

export function usePublicarDesignDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    DeliveryPublicoDesignMeResponseDTO,
    DeliveryPublicoDesignConfigDTO | void
  >(
    async ({ token }, draftAtual) =>
      publicarDesignDeliveryUseCase.execute(
        token,
        draftAtual === undefined || draftAtual === null ? undefined : draftAtual
      ),
    {
      onSuccess: async () => {
        await invalidate(DELIVERY_DESIGN_ME_QUERY_KEY)
      },
    }
  )
}

export function useLimparLogoEmpresaDelivery() {
  const invalidate = useInvalidateTenantQueries()
  return useSecureTenantMutation<void, void>(
    async ({ token }) => {
      await limparLogoEmpresaDeliveryUseCase.execute(token)
    },
    {
      onSuccess: async () => {
        await invalidate(DELIVERY_DESIGN_ME_QUERY_KEY)
      },
    }
  )
}

export function useLimparBannerEmpresaDelivery() {
  const invalidate = useInvalidateTenantQueries()
  return useSecureTenantMutation<void, void>(
    async ({ token }) => {
      await limparBannerEmpresaDeliveryUseCase.execute(token)
    },
    {
      onSuccess: async () => {
        await invalidate(DELIVERY_DESIGN_ME_QUERY_KEY)
      },
    }
  )
}
