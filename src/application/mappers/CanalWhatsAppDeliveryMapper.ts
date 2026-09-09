import {
  canalWhatsAppDeliveryStatusValidator,
  canalWhatsAppDeliveryValidator,
  QR_CODE_WHATSAPP_VALIDADE_MS,
  type CanalWhatsAppDeliveryDTO,
  type CanalWhatsAppDeliveryStatusDTO,
  type CanalWhatsAppQrCodeDTO,
} from '@/src/application/dto/delivery/CanalWhatsAppDeliveryDTO'

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const t = valor.trim()
  return t.length > 0 ? t : null
}

function lerQrCode(raw: unknown): CanalWhatsAppQrCodeDTO | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  return {
    base64: texto(o.base64),
    pairingCode: texto(o.pairingCode),
  }
}

export function srcImagemQrCodeWhatsApp(base64: string | null | undefined): string | null {
  const raw = base64?.trim()
  if (!raw) return null
  if (/^data:/i.test(raw)) return raw
  return `data:image/png;base64,${raw}`
}

export function qrCodeWhatsAppExpirado(recebidoEm: number, agora = Date.now()): boolean {
  return agora - recebidoEm >= QR_CODE_WHATSAPP_VALIDADE_MS
}

export function devePollarStatusCanalWhatsApp(input: {
  conectado: boolean
  temQrVisivel: boolean
  qrExpirado: boolean
}): boolean {
  if (input.conectado) return false
  if (input.qrExpirado) return false
  return input.temQrVisivel
}

export function normalizarCanalWhatsApp(payload: unknown): CanalWhatsAppDeliveryDTO | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  const qrcode = 'qrcode' in o ? lerQrCode(o.qrcode) : undefined
  const parsed = canalWhatsAppDeliveryValidator.safeParse({
    ...o,
    ...(qrcode ? { qrcode } : {}),
  })
  return parsed.success ? parsed.data : null
}

export function normalizarStatusCanalWhatsApp(
  payload: unknown
): CanalWhatsAppDeliveryStatusDTO | null {
  const parsed = canalWhatsAppDeliveryStatusValidator.safeParse(payload)
  return parsed.success ? parsed.data : null
}
