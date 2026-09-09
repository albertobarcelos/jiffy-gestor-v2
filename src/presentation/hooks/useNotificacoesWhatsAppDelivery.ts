'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import {
  buildTenantQueryKey,
  useInvalidateTenantQueries,
} from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { textoErroCorpoApi } from '@/src/infrastructure/api/apiClient'
import type {
  ConfiguracaoNotificacaoWhatsAppDTO,
  TipoNotificacaoWhatsAppDelivery,
} from '@/src/application/dto/delivery/NotificacaoWhatsAppDeliveryDTO'
import {
  normalizarListaNotificacoesWhatsApp,
  normalizarNotificacaoWhatsApp,
} from '@/src/application/mappers/NotificacaoWhatsAppDeliveryMapper'

export const NOTIFICACOES_WHATSAPP_QUERY_KEY = ['delivery', 'notificacoes-whatsapp'] as const

const BFF = '/api/delivery/empresas/me/notificacoes-whatsapp'

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

export function useNotificacoesWhatsAppDelivery(options?: { enabled?: boolean }) {
  return useSecureTenantQuery<ConfiguracaoNotificacaoWhatsAppDTO[]>(
    NOTIFICACOES_WHATSAPP_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi(BFF, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await parseJsonOrThrow(res)
      return normalizarListaNotificacoesWhatsApp(data)
    },
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
      const res = await fetchGestorApi(`${BFF}/${encodeURIComponent(tipo)}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ativo }),
      })
      const data = await parseJsonOrThrow(res)
      const item = normalizarNotificacaoWhatsApp(data)
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
