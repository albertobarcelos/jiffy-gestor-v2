'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { requireGestorConfig } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  criarAreaEntregaDelivery,
  excluirAreaEntregaDelivery,
  listarAreasEntregaDelivery,
  patchAreaEntregaDelivery,
} from '@/src/infrastructure/api/deliveryConfigApi'
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

export function useAreasEntregaDelivery(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  return useSecureTenantQuery<AreaEntregaDTO[]>(
    AREAS_ENTREGA_DELIVERY_QUERY_KEY,
    async ({ token }) =>
      normalizarListaAreasEntrega(
        requireGestorConfig(await listarAreasEntregaDelivery(token))
      ),
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
      const area = normalizarAreaEntregaResposta(
        requireGestorConfig(await criarAreaEntregaDelivery(token, input))
      )
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
      const area = normalizarAreaEntregaResposta(
        requireGestorConfig(await patchAreaEntregaDelivery(token, id, input))
      )
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

/** Vários PATCH e uma invalidação — usado no Salvar da cobertura. */
export function useAtualizarAreasEntregaEmLote() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    { ok: number; total: number },
    Array<{ id: string; input: UpdateAreaEntregaInput }>
  >(
    async ({ token }, patches) => {
      let ok = 0
      for (const patch of patches) {
        const res = await patchAreaEntregaDelivery(token, patch.id, patch.input)
        if (res.ok) ok += 1
      }
      return { ok, total: patches.length }
    },
    {
      onSettled: async () => {
        await invalidate(AREAS_ENTREGA_DELIVERY_QUERY_KEY)
      },
    }
  )
}

export function useExcluirAreaEntregaDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, string>(
    async ({ token }, id) => {
      requireGestorConfig(await excluirAreaEntregaDelivery(token, id))
    },
    {
      onSuccess: async () => {
        await invalidate(AREAS_ENTREGA_DELIVERY_QUERY_KEY)
      },
    }
  )
}
