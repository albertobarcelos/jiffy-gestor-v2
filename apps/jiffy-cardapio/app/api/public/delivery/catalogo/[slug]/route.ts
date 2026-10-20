import { NextRequest } from 'next/server'
import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'
import { proxyPublicDeliveryGet } from '@/src/infrastructure/bff/proxyPublicDeliveryRoute'
import { catalogoPublicoCacheControl } from '@/src/infrastructure/cache/catalogoPublicoCache'

/**
 * GET /api/public/delivery/catalogo/[slug]
 * Proxy público → GET /api/v1/delivery/catalogo/:slug
 *
 * Cache curto no edge/browser: catálogo muda pouco; invalidação fina fica no React Query.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = normalizarSlugPublico(rawSlug ?? '')
  if (!slug) {
    return Response.json({ error: 'Slug é obrigatório' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const allowed = new URLSearchParams()
  const offset = searchParams.get('offset')
  const limit = searchParams.get('limit')
  if (offset != null) allowed.set('offset', offset)
  if (limit != null) allowed.set('limit', limit)

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/catalogo/${encodeURIComponent(slug)}`,
    allowed,
    { cacheControl: catalogoPublicoCacheControl(), incoming: request }
  )
}
