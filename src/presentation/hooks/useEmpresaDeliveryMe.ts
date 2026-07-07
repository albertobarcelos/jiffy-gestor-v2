'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import type {
  CreateEmpresaDeliveryInput,
  EmpresaDeliveryDTO,
  UpdateEmpresaDeliveryInput,
} from '@/src/application/dto/delivery/EmpresaDeliveryDTO'

export const EMPRESA_DELIVERY_ME_QUERY_KEY = ['delivery', 'empresa-me'] as const

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

export function useEmpresaDeliveryMe() {
  return useSecureTenantQuery<EmpresaDeliveryDTO | null>(
    EMPRESA_DELIVERY_ME_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) return null
      const data = await parseJsonOrThrow(res)
      return data as EmpresaDeliveryDTO
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
    async ({ token }, input) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      const data = await parseJsonOrThrow(res)
      return data as EmpresaDeliveryDTO
    },
    {
      onSuccess: async () => {
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('jiffy:empresa-delivery-updated'))
        }
      },
    }
  )
}

export function useAtualizarEmpresaDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<EmpresaDeliveryDTO, UpdateEmpresaDeliveryInput>(
    async ({ token }, input) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      const data = await parseJsonOrThrow(res)
      return data as EmpresaDeliveryDTO
    },
    {
      onSuccess: async () => {
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('jiffy:empresa-delivery-updated'))
        }
      },
    }
  )
}
