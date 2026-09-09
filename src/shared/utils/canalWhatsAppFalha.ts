export const MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE =
  'Canal WhatsApp indisponível. Fale com o suporte Jiffy para verificar a configuração.'

export const CANAL_WHATSAPP_UNAVAILABLE_CODE = 'EVOLUTION_UNAVAILABLE'

export class CanalWhatsAppIndisponivelError extends Error {
  readonly code = CANAL_WHATSAPP_UNAVAILABLE_CODE
  readonly status = 503

  constructor() {
    super(MENSAGEM_CANAL_WHATSAPP_INDISPONIVEL_SUPORTE)
    this.name = 'CanalWhatsAppIndisponivelError'
  }
}

export function isCanalWhatsAppIndisponivel(error: unknown, status?: number): boolean {
  if (error instanceof CanalWhatsAppIndisponivelError) return true
  if (status === 503) return true
  if (
    error &&
    typeof error === 'object' &&
    (('errorCode' in error &&
      (error as { errorCode?: string }).errorCode === CANAL_WHATSAPP_UNAVAILABLE_CODE) ||
      ('code' in error && (error as { code?: string }).code === CANAL_WHATSAPP_UNAVAILABLE_CODE))
  ) {
    return true
  }
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status?: number }).status === 503
  }
  return false
}

export function logFalhaCanalWhatsApp(contexto: string, detalhe?: unknown): void {
  console.error('[jiffy:whatsapp-canal]', contexto, detalhe ?? '')
}
