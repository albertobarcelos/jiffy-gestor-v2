'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useQueryClient } from '@tanstack/react-query'
import {
  buildTenantQueryKey,
  useInvalidateTenantQueries,
} from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import type {
  AgendaFuncionamentoDeliveryDTO,
  DisponibilidadeFuncionamentoDeliveryDTO,
  FuncionamentoDeliveryDTO,
  SubstituirAgendaFuncionamentoDeliveryRequest,
} from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import { EMPRESA_DELIVERY_ME_QUERY_KEY } from '@/src/presentation/hooks/useEmpresaDeliveryMe'

export const FUNCIONAMENTO_DELIVERY_QUERY_KEY = ['delivery', 'funcionamento'] as const

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

export function useFuncionamentoDelivery(options?: { enabled?: boolean }) {
  return useSecureTenantQuery<FuncionamentoDeliveryDTO>(
    FUNCIONAMENTO_DELIVERY_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/funcionamento', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseJsonOrThrow(res)
      return data as FuncionamentoDeliveryDTO
    },
    { enabled: options?.enabled ?? true }
  )
}

export function useAgendaFuncionamentoDelivery(options?: { enabled?: boolean }) {
  return useSecureTenantQuery<AgendaFuncionamentoDeliveryDTO>(
    [...FUNCIONAMENTO_DELIVERY_QUERY_KEY, 'agenda'],
    async ({ token }) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/funcionamento/agenda', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseJsonOrThrow(res)
      return data as AgendaFuncionamentoDeliveryDTO
    },
    { enabled: options?.enabled ?? true }
  )
}

function patchFuncionamentoDisponibilidadeNoCache(
  queryClient: ReturnType<typeof useQueryClient>,
  empresaId: string | null,
  disponibilidade: DisponibilidadeFuncionamentoDeliveryDTO
) {
  queryClient.setQueryData<FuncionamentoDeliveryDTO>(
    buildTenantQueryKey(empresaId, FUNCIONAMENTO_DELIVERY_QUERY_KEY),
    atual =>
      atual
        ? {
            ...atual,
            aberta: disponibilidade.aberta,
            motivo: disponibilidade.motivo,
            proximaTransicaoEm: disponibilidade.proximaTransicaoEm,
            alteracaoAtual: disponibilidade.alteracaoAtual,
          }
        : atual
  )
}

export function useSubstituirAgendaFuncionamento() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<
    AgendaFuncionamentoDeliveryDTO,
    SubstituirAgendaFuncionamentoDeliveryRequest
  >(async ({ token }, variables) => {
    const res = await fetchGestorApi('/api/delivery/empresas/me/funcionamento/agenda', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(variables),
    })
    const data = await parseJsonOrThrow(res)
    return data as AgendaFuncionamentoDeliveryDTO
  }, {
    onSuccess: async () => {
      await invalidate(FUNCIONAMENTO_DELIVERY_QUERY_KEY)
      await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
    },
  })
}

export function useToggleFuncionamentoManual() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTenantQueries()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<DisponibilidadeFuncionamentoDeliveryDTO, void>(
    async ({ token }) => {
      const res = await fetchGestorApi('/api/delivery/empresas/me/funcionamento/toggle', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseJsonOrThrow(res)
      return data as DisponibilidadeFuncionamentoDeliveryDTO
    },
    {
      onSuccess: async disponibilidade => {
        patchFuncionamentoDisponibilidadeNoCache(queryClient, empresaId, disponibilidade)
        await invalidate(FUNCIONAMENTO_DELIVERY_QUERY_KEY)
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
      },
    }
  )
}
