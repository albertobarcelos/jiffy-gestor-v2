'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import type {
  AreaEntregaDTO,
  CreateAreaEntregaInput,
  UpdateAreaEntregaInput,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  normalizarAreaEntregaResposta,
  normalizarListaAreasEntrega,
} from '@/src/application/mappers/AreaEntregaMapper'

export const AREAS_ENTREGA_DELIVERY_QUERY_KEY = ['delivery', 'areas-entrega'] as const

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

export function useAreasEntregaDelivery(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  return useSecureTenantQuery<AreaEntregaDTO[]>(
    AREAS_ENTREGA_DELIVERY_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/areas-entrega', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseJsonOrThrow(res)
      return normalizarListaAreasEntrega(data)
    },
    {
      enabled,
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useCriarAreaEntregaDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<AreaEntregaDTO, CreateAreaEntregaInput>(
    async ({ token }, input) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/areas-entrega', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      const data = await parseJsonOrThrow(res)
      const area = normalizarAreaEntregaResposta(data)
      if (!area) throw new Error('Resposta inválida ao criar área de entrega')
      return area
    },
    {
      onSuccess: async () => {
        await invalidate(AREAS_ENTREGA_DELIVERY_QUERY_KEY)
      },
    }
  )
}

export function useAtualizarAreaEntregaDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    AreaEntregaDTO,
    { id: string; input: UpdateAreaEntregaInput }
  >(
    async ({ token }, { id, input }) => {
      const res = await fetchGestorApi(
        `/api/delivery/empresas/me/areas-entrega/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        }
      )
      const data = await parseJsonOrThrow(res)
      const area = normalizarAreaEntregaResposta(data)
      if (!area) throw new Error('Resposta inválida ao atualizar área de entrega')
      return area
    },
    {
      onSuccess: async () => {
        await invalidate(AREAS_ENTREGA_DELIVERY_QUERY_KEY)
      },
    }
  )
}

export function useExcluirAreaEntregaDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, string>(
    async ({ token }, id) => {
      const res = await fetchGestorApi(
        `/api/delivery/empresas/me/areas-entrega/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok && res.status !== 204) {
        await parseJsonOrThrow(res)
      }
    },
    {
      onSuccess: async () => {
        await invalidate(AREAS_ENTREGA_DELIVERY_QUERY_KEY)
      },
    }
  )
}
