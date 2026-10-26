'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import {
  buildTenantQueryKey,
  useInvalidateTenantQueries,
} from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { requireGestorConfig } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  listarNotificacoesWhatsAppDelivery,
  patchNotificacaoWhatsAppDelivery,
} from '@/src/infrastructure/api/deliveryConfigApi'
import type {
  ConfiguracaoNotificacaoWhatsAppDTO,
  TipoNotificacaoWhatsAppDelivery,
} from '@/src/application/dto/delivery/NotificacaoWhatsAppDeliveryDTO'
import {
  normalizarListaNotificacoesWhatsApp,
  normalizarNotificacaoWhatsApp,
} from '@/src/application/mappers/NotificacaoWhatsAppDeliveryMapper'

export const NOTIFICACOES_WHATSAPP_QUERY_KEY = ['delivery', 'notificacoes-whatsapp'] as const

export function useNotificacoesWhatsAppDelivery(options?: { enabled?: boolean }) {
  return useSecureTenantQuery<ConfiguracaoNotificacaoWhatsAppDTO[]>(
    NOTIFICACOES_WHATSAPP_QUERY_KEY,
    async ({ token }) =>
      normalizarListaNotificacoesWhatsApp(
        requireGestorConfig(await listarNotificacoesWhatsAppDelivery(token))
      ),
    {
      enabled: options?.enabled ?? true,
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}

export function useUpsertNotificacaoWhatsAppDelivery() {
  const invalidate = useInvalidateTenantQueries()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  return useSecureTenantMutation<
    ConfiguracaoNotificacaoWhatsAppDTO,
    { tipo: TipoNotificacaoWhatsAppDelivery; ativo: boolean },
    { anterior?: ConfiguracaoNotificacaoWhatsAppDTO[]; key?: readonly unknown[] }
  >(
    async ({ token }, { tipo, ativo }) => {
      const item = normalizarNotificacaoWhatsApp(
        requireGestorConfig(await patchNotificacaoWhatsAppDelivery(token, tipo, { ativo }))
      )
      if (!item) throw new Error('Resposta inválida ao salvar a notificação.')
      return item
    },
    {
      onMutate: async ({ tipo, ativo }) => {
        const key = buildTenantQueryKey(empresaId, NOTIFICACOES_WHATSAPP_QUERY_KEY)
        await queryClient.cancelQueries({ queryKey: key })
        const anterior = queryClient.getQueryData<ConfiguracaoNotificacaoWhatsAppDTO[]>(key)
        queryClient.setQueryData<ConfiguracaoNotificacaoWhatsAppDTO[]>(key, atual =>
          (atual ?? []).map(item =>
            item.tipoNotificacao === tipo ? { ...item, ativo, persistido: true } : item
          )
        )
        return { anterior, key }
      },
      onError: (_erro, _vars, context) => {
        if (context?.key && context.anterior) {
          queryClient.setQueryData(context.key, context.anterior)
        }
      },
      onSuccess: async item => {
        const key = buildTenantQueryKey(empresaId, NOTIFICACOES_WHATSAPP_QUERY_KEY)
        queryClient.setQueryData<ConfiguracaoNotificacaoWhatsAppDTO[]>(key, atual =>
          (atual ?? []).map(existente =>
            existente.tipoNotificacao === item.tipoNotificacao ? item : existente
          )
        )
        await invalidate(NOTIFICACOES_WHATSAPP_QUERY_KEY)
      },
    }
  )
}
