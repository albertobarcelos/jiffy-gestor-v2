'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { requireGestorConfig } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  buscarDesignDeliveryMe,
  limparBannerEmpresaDelivery,
  limparLogoEmpresaDelivery,
  publicarDesignDelivery,
  salvarDraftDesignDelivery,
} from '@/src/infrastructure/api/deliveryDesignApi'
import {
  deliveryPublicoDesignMeResponseSchema,
  type DeliveryPublicoDesignConfigDTO,
  type DeliveryPublicoDesignMeResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDesignDTO'
import { validarDraftDesign } from '@/src/application/services/delivery/validarDraftDesign'
import { validarPublicacaoDesign } from '@/src/application/services/delivery/validarPublicacaoDesign'

export const DELIVERY_DESIGN_ME_QUERY_KEY = ['delivery', 'design-me'] as const

function parseMeResponse(raw: unknown): DeliveryPublicoDesignMeResponseDTO {
  return deliveryPublicoDesignMeResponseSchema.parse(raw)
}

export function useDeliveryDesignMe(enabled = true) {
  return useSecureTenantQuery<DeliveryPublicoDesignMeResponseDTO>(
    DELIVERY_DESIGN_ME_QUERY_KEY,
    async ({ token }) =>
      parseMeResponse(requireGestorConfig(await buscarDesignDeliveryMe(token))),
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
    async ({ token }, body) => {
      const validated = validarDraftDesign(body)
      return parseMeResponse(
        requireGestorConfig(await salvarDraftDesignDelivery(token, validated))
      )
    },
    {
      onSuccess: async () => {
        await invalidate(DELIVERY_DESIGN_ME_QUERY_KEY)
      },
    }
  )
}

export function usePublicarDesignDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<DeliveryPublicoDesignMeResponseDTO, void>(
    async ({ token }) =>
      parseMeResponse(requireGestorConfig(await publicarDesignDelivery(token))),
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
      requireGestorConfig(await limparLogoEmpresaDelivery(token))
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
      requireGestorConfig(await limparBannerEmpresaDelivery(token))
    },
    {
      onSuccess: async () => {
        await invalidate(DELIVERY_DESIGN_ME_QUERY_KEY)
      },
    }
  )
}

export function assertDesignPublicavel(config: DeliveryPublicoDesignConfigDTO) {
  return validarPublicacaoDesign(config)
}
