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
import {
  CanalWhatsAppIndisponivelError,
  isCanalWhatsAppIndisponivel,
  logFalhaCanalWhatsApp,
} from '@/src/shared/utils/canalWhatsAppFalha'
import type {
  CanalWhatsAppDeliveryDTO,
  CanalWhatsAppDeliveryStatusDTO,
} from '@/src/application/dto/delivery/CanalWhatsAppDeliveryDTO'
import { CANAL_WHATSAPP_STATUS_POLL_MS } from '@/src/application/dto/delivery/CanalWhatsAppDeliveryDTO'
import {
  normalizarCanalWhatsApp,
  normalizarStatusCanalWhatsApp,
} from '@/src/application/mappers/CanalWhatsAppDeliveryMapper'

export const CANAL_WHATSAPP_QUERY_KEY = ['delivery', 'canal-whatsapp'] as const
export const CANAL_WHATSAPP_STATUS_QUERY_KEY = ['delivery', 'canal-whatsapp-status'] as const

const BFF = '/api/delivery/empresas/me/canal-whatsapp'

export class CanalWhatsAppHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'CanalWhatsAppHttpError'
  }
}

async function lerCorpo(res: Response): Promise<unknown> {
  if (res.status === 204) return null
  return res.json().catch(() => ({}))
}

function erroDeResposta(res: Response, raw: unknown): Error {
  if (isCanalWhatsAppIndisponivel(raw, res.status)) {
    logFalhaCanalWhatsApp(`HTTP ${res.status}`, raw)
    return new CanalWhatsAppIndisponivelError()
  }
  const msg =
    textoErroCorpoApi(raw) ||
    (raw &&
    typeof raw === 'object' &&
    'error' in raw &&
    typeof (raw as { error: unknown }).error === 'string'
      ? (raw as { error: string }).error
      : '') ||
    `Erro HTTP ${res.status}`
  return new CanalWhatsAppHttpError(msg, res.status)
}

async function parseCanalOuThrow(res: Response): Promise<CanalWhatsAppDeliveryDTO> {
  const raw = await lerCorpo(res)
  if (!res.ok) throw erroDeResposta(res, raw)
  const canal = normalizarCanalWhatsApp(raw)
  if (!canal) throw new Error('Resposta inválida do canal WhatsApp.')
  return canal
}

async function invalidarCanalEEmpresa(
  invalidate: ReturnType<typeof useInvalidateTenantQueries>
): Promise<void> {
  await invalidate(CANAL_WHATSAPP_QUERY_KEY)
  await invalidate(CANAL_WHATSAPP_STATUS_QUERY_KEY)
  await invalidate(EMPRESA_DELIVERY_ME_QUERY_KEY)
  dispararEmpresaDeliveryAtualizada()
}

export function useCanalWhatsAppDelivery() {
  return useSecureTenantQuery<CanalWhatsAppDeliveryDTO | null>(
    CANAL_WHATSAPP_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi(BFF, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) return null
      const raw = await lerCorpo(res)
      if (!res.ok) throw erroDeResposta(res, raw)
      return normalizarCanalWhatsApp(raw)
    },
    {
      staleTime: 1000 * 15,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof CanalWhatsAppIndisponivelError) return false
        if (error instanceof CanalWhatsAppHttpError && error.status === 404) return false
        return failureCount < 1
      },
    }
  )
}

export function useCanalWhatsAppStatus(options: {
  enabled: boolean
  pollar: boolean
}) {
  return useSecureTenantQuery<CanalWhatsAppDeliveryStatusDTO | null>(
    CANAL_WHATSAPP_STATUS_QUERY_KEY,
    async ({ token }) => {
      const res = await fetchGestorApi(`${BFF}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) return null
      const raw = await lerCorpo(res)
      if (!res.ok) throw erroDeResposta(res, raw)
      return normalizarStatusCanalWhatsApp(raw)
    },
    {
      enabled: options.enabled,
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchInterval: options.pollar ? CANAL_WHATSAPP_STATUS_POLL_MS : false,
      refetchIntervalInBackground: options.pollar,
      retry: (failureCount, error) => {
        if (error instanceof CanalWhatsAppIndisponivelError) return false
        return failureCount < 1
      },
    }
  )
}

export function useSubstituirCanalWhatsApp() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<CanalWhatsAppDeliveryDTO, void>(
    async ({ token }) => {
      const res = await fetchGestorApi(BFF, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      })
      return parseCanalOuThrow(res)
    },
    {
      onSuccess: async () => {
        await invalidarCanalEEmpresa(invalidate)
      },
    }
  )
}

export function useRenovarQrCodeCanalWhatsApp() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<CanalWhatsAppDeliveryDTO, void>(
    async ({ token }) => {
      const res = await fetchGestorApi(`${BFF}/qrcode`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return parseCanalOuThrow(res)
    },
    {
      onSuccess: async () => {
        await invalidate(CANAL_WHATSAPP_QUERY_KEY)
        await invalidate(CANAL_WHATSAPP_STATUS_QUERY_KEY)
      },
    }
  )
}

export function useRemoverCanalWhatsApp() {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation<void, void>(
    async ({ token }) => {
      const res = await fetchGestorApi(BFF, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 204 || res.status === 404) return
      const raw = await lerCorpo(res)
      if (!res.ok) throw erroDeResposta(res, raw)
    },
    {
      onSuccess: async () => {
        await invalidarCanalEEmpresa(invalidate)
      },
    }
  )
}

export function isCanalWhatsAppIndisponivelError(error: unknown): boolean {
  return error instanceof CanalWhatsAppIndisponivelError || isCanalWhatsAppIndisponivel(error)
}
