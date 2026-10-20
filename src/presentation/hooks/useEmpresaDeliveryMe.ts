'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useQueryClient } from '@tanstack/react-query'
import {
  buildTenantQueryKey,
  useInvalidateTenantQueries,
} from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { requireGestorConfig } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  criarEmpresaDeliveryMe,
  getEmpresaDeliveryMe,
  patchEmpresaDeliveryMe,
} from '@/src/infrastructure/api/deliveryConfigApi'
import type {
  CreateEmpresaDeliveryInput,
  EmpresaDeliveryDTO,
  UpdateEmpresaDeliveryInput,
} from '@/src/application/dto/delivery/EmpresaDeliveryDTO'
import {
  EMPRESA_DELIVERY_UPDATED_EVENT,
  type EmpresaDeliveryUpdatedDetail,
} from '@/src/shared/constants/empresaDeliveryEvents'

export const EMPRESA_DELIVERY_ME_QUERY_KEY = ['delivery', 'empresa-me'] as const

function dispatchEmpresaDeliveryUpdated(slug: string | null | undefined) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<EmpresaDeliveryUpdatedDetail>(EMPRESA_DELIVERY_UPDATED_EVENT, {
      detail: { slug: slug ?? null },
    })
  )
}

/** Recarrega pendências/hub quando cobertura, WhatsApp ou empresa delivery mudam. */
export function dispararEmpresaDeliveryAtualizada(slug?: string | null): void {
  dispatchEmpresaDeliveryUpdated(slug)
}

export function useEmpresaDeliveryMe() {
  return useSecureTenantQuery<EmpresaDeliveryDTO | null>(
    EMPRESA_DELIVERY_ME_QUERY_KEY,
    async ({ token }) => {
      const res = await getEmpresaDeliveryMe(token)
      if (res.status === 404) return null
      return requireGestorConfig(res) as EmpresaDeliveryDTO
    },
    {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error.message.includes('404')) return false
        return failureCount < 1
      },
    }
  )
}

export function useCriarEmpresaDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<EmpresaDeliveryDTO, CreateEmpresaDeliveryInput>(
    async ({ token }, input) =>
      requireGestorConfig(await criarEmpresaDeliveryMe(token, input)) as EmpresaDeliveryDTO,
    {
      onSuccess: async data => {
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
        dispatchEmpresaDeliveryUpdated(data.slug)
      },
    }
  )
}

export function useAtualizarEmpresaDelivery() {
  const invalidate = useInvalidateTenantQueries()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<EmpresaDeliveryDTO, UpdateEmpresaDeliveryInput>(
    async ({ token }, input) =>
      requireGestorConfig(await patchEmpresaDeliveryMe(token, input)) as EmpresaDeliveryDTO,
    {
      onSuccess: async data => {
        queryClient.setQueryData(
          buildTenantQueryKey(empresaId, EMPRESA_DELIVERY_ME_QUERY_KEY),
          data
        )
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
        dispatchEmpresaDeliveryUpdated(data.slug)
      },
    }
  )
}
