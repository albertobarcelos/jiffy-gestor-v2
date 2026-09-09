'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import {
  dispararEmpresaDeliveryAtualizada,
  EMPRESA_DELIVERY_ME_QUERY_KEY,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
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

export function useRaiosEntregaDelivery(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true

  return useSecureTenantQuery<RaioEntregaDTO[]>(
    RAIOS_ENTREGA_DELIVERY_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/raios-entrega', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseJsonOrThrow(res)
      return normalizarListaRaiosEntrega(data)
    },
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
        const res = await fetchGestorApi('/api/delivery/empresas/me/raios-entrega', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        })
        await parseJsonOrThrow(res)
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
      const res = await fetchGestorApi(
        `/api/delivery/empresas/me/raios-entrega/${encodeURIComponent(id)}`,
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
      const raio = normalizarRaioEntregaResposta(data)
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
        const res = await fetchGestorApi(
          `/api/delivery/empresas/me/raios-entrega/${encodeURIComponent(patch.id)}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(patch.input),
          }
        )
        try {
          await parseJsonOrThrow(res)
          ok += 1
        } catch {
          // Continua as demais faixas; o Salvar reporta o parcial.
        }
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
        const res = await fetchGestorApi(
          `/api/delivery/empresas/me/raios-entrega/${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!res.ok && res.status !== 204) {
          await parseJsonOrThrow(res)
        }
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
