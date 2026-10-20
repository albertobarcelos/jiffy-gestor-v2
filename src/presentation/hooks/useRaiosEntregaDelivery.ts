'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import {
  dispararEmpresaDeliveryAtualizada,
  EMPRESA_DELIVERY_ME_QUERY_KEY,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { requireGestorConfig } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  criarRaioEntregaDelivery,
  excluirRaioEntregaDelivery,
  listarRaiosEntregaDelivery,
  patchRaioEntregaDelivery,
} from '@/src/infrastructure/api/deliveryConfigApi'
import type {
  CreateRaioEntregaInput,
  RaioEntregaDTO,
  UpdateRaioEntregaInput,
} from '@/src/application/dto/delivery/CoberturaEntregaDTO'
import {
  normalizarListaRaiosEntrega,
  normalizarRaioEntregaResposta,
} from '@/src/application/mappers/RaioEntregaMapper'

export const RAIOS_ENTREGA_DELIVERY_QUERY_KEY = ['delivery', 'raios-entrega'] as const

export function useRaiosEntregaDelivery(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  return useSecureTenantQuery<RaioEntregaDTO[]>(
    RAIOS_ENTREGA_DELIVERY_QUERY_KEY,
    async ({ token }) =>
      normalizarListaRaiosEntrega(
        requireGestorConfig(await listarRaiosEntregaDelivery(token))
      ),
    {
      enabled,
      staleTime: 1000 * 60,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useCriarRaiosEntregaEmLote() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<number, CreateRaioEntregaInput[]>(
    async ({ token }, inputs) => {
      for (const input of inputs) {
        requireGestorConfig(await criarRaioEntregaDelivery(token, input))
      }
      return inputs.length
    },
    {
      onSuccess: async () => {
        await invalidate(RAIOS_ENTREGA_DELIVERY_QUERY_KEY)
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
        dispararEmpresaDeliveryAtualizada()
      },
    }
  )
}

export function useAtualizarRaioEntregaDelivery() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    RaioEntregaDTO,
    { id: string; input: UpdateRaioEntregaInput }
  >(
    async ({ token }, { id, input }) => {
      const raio = normalizarRaioEntregaResposta(
        requireGestorConfig(await patchRaioEntregaDelivery(token, id, input))
      )
      if (!raio) throw new Error('Resposta inválida ao atualizar raio de entrega')
      return raio
    },
    {
      onSuccess: async () => {
        await invalidate(RAIOS_ENTREGA_DELIVERY_QUERY_KEY)
      },
    }
  )
}

/** Vários PATCH e uma invalidação — usado no Salvar da cobertura. */
export function useAtualizarRaiosEntregaEmLote() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    { ok: number; total: number },
    Array<{ id: string; input: UpdateRaioEntregaInput }>
  >(
    async ({ token }, patches) => {
      let ok = 0
      for (const patch of patches) {
        const res = await patchRaioEntregaDelivery(token, patch.id, patch.input)
        if (res.ok) ok += 1
      }
      return { ok, total: patches.length }
    },
    {
      onSettled: async () => {
        await invalidate(RAIOS_ENTREGA_DELIVERY_QUERY_KEY)
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
        dispararEmpresaDeliveryAtualizada()
      },
    }
  )
}

/** Apaga vários raios e invalida a lista uma vez. Usado ao reduzir o alcance (faixas acima). */
export function useExcluirRaiosEntregaEmLote() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<number, string[]>(
    async ({ token }, ids) => {
      for (const id of ids) {
        requireGestorConfig(await excluirRaioEntregaDelivery(token, id))
      }
      return ids.length
    },
    {
      onSuccess: async () => {
        await invalidate(RAIOS_ENTREGA_DELIVERY_QUERY_KEY)
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
        dispararEmpresaDeliveryAtualizada()
      },
    }
  )
}
