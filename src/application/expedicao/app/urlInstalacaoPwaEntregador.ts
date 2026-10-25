import {
  EXPEDICAO_APP_PATH_CURTO,
  URL_PUBLICA_APP_ENTREGADOR,
} from '@/src/application/expedicao/app/constantesSuperficie'

export function hostDaOrigin(origin: string | null | undefined): string {
  const bruto = String(origin ?? '').trim()
  if (!bruto) return ''
  try {
    const href = bruto.includes('://') ? bruto : `http://${bruto}`
    return new URL(href).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function ehOriginLocalDesenvolvimento(origin: string | null | undefined): boolean {
  const host = hostDaOrigin(origin)
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

/** Homologação ainda não tem entregador.*. O QR abre o Gestor + `/e`. */
export function ehOriginHomologacao(origin: string | null | undefined): boolean {
  const host = hostDaOrigin(origin)
  return host.includes('homolog') || host.includes('homologacao')
}

/** QR do cadastro: domínio público. Local e homolog continuam no Gestor + `/e`. */
export function urlInstalacaoPwaEntregador(origin: string | null | undefined): string {
  const base = String(origin ?? '')
    .trim()
    .replace(/\/$/, '')
  if (base && (ehOriginLocalDesenvolvimento(base) || ehOriginHomologacao(base))) {
    return `${base}${EXPEDICAO_APP_PATH_CURTO}`
  }
  return URL_PUBLICA_APP_ENTREGADOR
}
