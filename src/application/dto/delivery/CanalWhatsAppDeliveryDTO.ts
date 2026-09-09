import { z } from 'zod'

export const CANAL_WHATSAPP_STATUS = ['conectando', 'conectado', 'desconectado'] as const

export type CanalWhatsAppStatus = (typeof CANAL_WHATSAPP_STATUS)[number]

export const canalWhatsAppStatusValidator = z.enum(CANAL_WHATSAPP_STATUS)

export const canalWhatsAppQrCodeValidator = z.object({
  base64: z.string().nullable(),
  pairingCode: z.string().nullable(),
})

export type CanalWhatsAppQrCodeDTO = z.infer<typeof canalWhatsAppQrCodeValidator>

export const canalWhatsAppDeliveryValidator = z.object({
  id: z.string(),
  instanceName: z.string(),
  status: canalWhatsAppStatusValidator,
  conectado: z.boolean(),
  dataCriacao: z.string(),
  dataAtualizacao: z.string(),
  qrcode: canalWhatsAppQrCodeValidator.optional(),
})

export type CanalWhatsAppDeliveryDTO = z.infer<typeof canalWhatsAppDeliveryValidator>

export const canalWhatsAppDeliveryStatusValidator = z.object({
  instanceName: z.string(),
  status: canalWhatsAppStatusValidator,
  conectado: z.boolean(),
})

export type CanalWhatsAppDeliveryStatusDTO = z.infer<
  typeof canalWhatsAppDeliveryStatusValidator
>

/** Validade documentada do QR na Evolution (~60s). */
export const QR_CODE_WHATSAPP_VALIDADE_MS = 60_000

export const CANAL_WHATSAPP_STATUS_POLL_MS = 1_500
