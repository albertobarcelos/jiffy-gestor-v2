import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'
import { isReservedCardapioSlug } from './reservedCardapioSlugs'

const PRIMEIRO_SEGMENTO_RESERVADO = new Set([
  'api',
  'instrucoes',
  '_next',
  'images',
  'videos',
])

/**
 * Pathname com o slug da loja já limpo, ou `null` se não houver o que mudar.
 * Home, carrinho, pedido e BFF de catálogo / meios de pagamento.
 */
export function reescreverCaminhoSlugPublico(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return null

  const indiceSlug = indiceDoSlugNoCaminho(parts)
  if (indiceSlug == null) return null

  const bruto = parts[indiceSlug] ?? ''
  const limpo = normalizarSlugPublico(bruto)
  if (!limpo || isReservedCardapioSlug(limpo) || limpo === bruto) return null

  parts[indiceSlug] = limpo
  return `/${parts.join('/')}`
}

function indiceDoSlugNoCaminho(parts: string[]): number | null {
  if (
    parts[0] === 'api' &&
    parts[1] === 'public' &&
    parts[2] === 'delivery' &&
    (parts[3] === 'catalogo' || parts[3] === 'meios-pagamento') &&
    parts[4]
  ) {
    return 4
  }

  const primeiro = parts[0] ?? ''
  if (!primeiro || PRIMEIRO_SEGMENTO_RESERVADO.has(primeiro)) return null
  if (isReservedCardapioSlug(primeiro)) return null
  return 0
}
