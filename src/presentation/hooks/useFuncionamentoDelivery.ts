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
  getAgendaFuncionamentoDelivery,
  getFuncionamentoDelivery,
  postToggleFuncionamentoDelivery,
  putAgendaFuncionamentoDelivery,
} from '@/src/infrastructure/api/deliveryConfigApi'
import type {
  AgendaFuncionamentoDeliveryDTO,
  DisponibilidadeFuncionamentoDeliveryDTO,
  FuncionamentoDeliveryDTO,
  SubstituirAgendaFuncionamentoDeliveryRequest,
} from '@/src/application/dto/delivery/FuncionamentoDeliveryDTO'
import { EMPRESA_DELIVERY_ME_QUERY_KEY } from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import { msAteRefetchFuncionamentoDelivery } from '@/src/shared/utils/funcionamentoDelivery'

export const FUNCIONAMENTO_DELIVERY_QUERY_KEY = ['delivery', 'funcionamento'] as const

export function useFuncionamentoDelivery(options?: { enabled?: boolean }) {
  return useSecureTenantQuery<FuncionamentoDeliveryDTO>(
    FUNCIONAMENTO_DELIVERY_QUERY_KEY,
    async ({ token }) =>
      requireGestorConfig(await getFuncionamentoDelivery(token)) as FuncionamentoDeliveryDTO,
    {
      enabled: options?.enabled ?? true,
      staleTime: 0,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      refetchInterval: query => msAteRefetchFuncionamentoDelivery(query.state.data),
    }
  )
}

export function useAgendaFuncionamentoDelivery(options?: { enabled?: boolean }) {
  return useSecureTenantQuery<AgendaFuncionamentoDeliveryDTO>(
    [...FUNCIONAMENTO_DELIVERY_QUERY_KEY, 'agenda'],
    async ({ token }) =>
      requireGestorConfig(
        await getAgendaFuncionamentoDelivery(token)
      ) as AgendaFuncionamentoDeliveryDTO,
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
    return requireGestorConfig(
      await putAgendaFuncionamentoDelivery(token, variables)
    ) as AgendaFuncionamentoDeliveryDTO
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
    async ({ token }) =>
      requireGestorConfig(
        await postToggleFuncionamentoDelivery(token)
      ) as DisponibilidadeFuncionamentoDeliveryDTO,
    {
      onSuccess: async disponibilidade => {
        patchFuncionamentoDisponibilidadeNoCache(queryClient, empresaId, disponibilidade)
        await invalidate(FUNCIONAMENTO_DELIVERY_QUERY_KEY)
        await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
      },
    }
  )
}
