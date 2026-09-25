/** Reserva: cards não usam `priority` (LCP é a capa). */
export const PRIMEIRAS_IMAGENS_PRIORITY = 4

export const DELIVERY_IMAGEM_SIZES = {
  capa: '100vw',
  logo: '64px',
  catalogoCard: '(max-width: 640px) 68vw, 248px',
  gradeCard: '(max-width: 640px) 50vw, 280px',
  vitrineCard: '(max-width: 640px) 100vw, 640px',
  listThumb: '(max-width: 640px) 7rem, 10rem',
  sugestao: '(max-width: 640px) 7.25rem, 136px',
} as const

export function isDeliveryPublicoImageHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase()
  if (!host) return false
  return (
    host === 'localhost' ||
    host === 'amazonaws.com' ||
    host.endsWith('.amazonaws.com') ||
    host.endsWith('.cloudfront.net') ||
    host.endsWith('.r2.dev') ||
    host.endsWith('.r2.cloudflarestorage.com')
  )
}

/** Host conhecido do storage: Next/Vercel pode redimensionar. Outros caem no original. */
export function deveUsarOtimizadorImagem(src: string): boolean {
  const trimmed = src.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/')) return true
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    return isDeliveryPublicoImageHost(url.hostname)
  } catch {
    return false
  }
}

export function devePriorizarImagemProduto(
  primeirasImagensPriority: boolean,
  index: number
): boolean {
  return primeirasImagensPriority && index < PRIMEIRAS_IMAGENS_PRIORITY
}
