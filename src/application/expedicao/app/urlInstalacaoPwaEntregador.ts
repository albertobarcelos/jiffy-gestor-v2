import {
  EXPEDICAO_APP_PATH_CURTO,
  URL_PUBLICA_APP_ENTREGADOR,
} from '@/src/application/expedicao/app/constantesSuperficie'

export function ehOriginLocalDesenvolvimento(origin: string | null | undefined): boolean {
  const bruto = String(origin ?? '').trim()
  if (!bruto) return false
  try {
    const href = bruto.includes('://') ? bruto : `http://${bruto}`
    const host = new URL(href).hostname.toLowerCase()
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
  } catch {
    return false
  }
}

/** QR do cadastro: domínio público. Em localhost continua `/e` para testar o PWA. */
export function urlInstalacaoPwaEntregador(origin: string | null | undefined): string {
  const base = String(origin ?? '')
    .trim()
    .replace(/\/$/, '')
  if (base && ehOriginLocalDesenvolvimento(base)) {
    return `${base}${EXPEDICAO_APP_PATH_CURTO}`
  }
  return URL_PUBLICA_APP_ENTREGADOR
}
