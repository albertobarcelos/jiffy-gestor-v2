/**
 * URL pública do cupom NFC-e (`/notas-fiscais/{vendaId}`), sem autenticação.
 * Base: `NEXT_PUBLIC_APP_URL` (hom/prod) ou `window.location.origin` em dev.
 */
export function resolveGestorAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return ''
}

export function buildNotaFiscalPublicaUrl(vendaId: string): string {
  const id = vendaId?.trim()
  if (!id) {
    throw new Error('ID da venda é obrigatório para abrir o cupom público.')
  }
  const base = resolveGestorAppBaseUrl()
  if (!base) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL não configurada e origem do navegador indisponível.'
    )
  }
  return `${base}/notas-fiscais/${encodeURIComponent(id)}`
}

export function abrirNotaFiscalPublica(vendaId: string): void {
  const url = buildNotaFiscalPublicaUrl(vendaId)
  window.open(url, '_blank', 'noopener,noreferrer')
}
