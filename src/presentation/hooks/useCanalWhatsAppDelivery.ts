'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import {
  dispararEmpresaDeliveryAtualizada,
  EMPRESA_DELIVERY_ME_QUERY_KEY,
} from '@/src/presentation/hooks/useEmpresaDeliveryMe'
import type { GestorConfigResult } from '@/src/infrastructure/api/gestorConfigRequest'
import {
  excluirCanalWhatsAppDelivery,
  getCanalWhatsAppDelivery,
  getCanalWhatsAppQrcodeDelivery,
  getCanalWhatsAppStatusDelivery,
  putCanalWhatsAppDelivery,
} from '@/src/infrastructure/api/deliveryConfigApi'
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

export class CanalWhatsAppHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
    this.name = 'CanalWhatsAppHttpError'
  }
}

function erroDeResultado(res: Extract<GestorConfigResult<unknown>, { ok: false }>): Error {
  if (isCanalWhatsAppIndisponivel(res.data, res.status)) {
    logFalhaCanalWhatsApp(`HTTP ${res.status}`, res.data)
    return new CanalWhatsAppIndisponivelError()
  }
  return new CanalWhatsAppHttpError(res.error, res.status)
}

function canalOuThrow(res: GestorConfigResult<unknown>): CanalWhatsAppDeliveryDTO {
  if (!res.ok) throw erroDeResultado(res)
  const canal = normalizarCanalWhatsApp(res.data)
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
      const res = await getCanalWhatsAppDelivery(token)
      if (res.status === 404) return null
      if (!res.ok) throw erroDeResultado(res)
      return normalizarCanalWhatsApp(res.data)
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
      const res = await getCanalWhatsAppStatusDelivery(token)
      if (res.status === 404) return null
      if (!res.ok) throw erroDeResultado(res)
      return normalizarStatusCanalWhatsApp(res.data)
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
    async ({ token }) => canalOuThrow(await putCanalWhatsAppDelivery(token)),
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
    async ({ token }) => canalOuThrow(await getCanalWhatsAppQrcodeDelivery(token)),
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
      const res = await excluirCanalWhatsAppDelivery(token)
      if (res.ok || res.status === 404) return
      throw erroDeResultado(res)
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
