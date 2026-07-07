import { NextRequest } from 'next/server'
import { proxyPublicDeliveryGet } from '@/src/shared/utils/proxyPublicDeliveryRoute'

/**
 * GET /api/public/delivery/catalogo/[slug]
 * Proxy público → GET /api/v1/delivery/catalogo/:slug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!slug?.trim()) {
    return Response.json({ error: 'Slug é obrigatório' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const allowed = new URLSearchParams()
  const offset = searchParams.get('offset')
  const limit = searchParams.get('limit')
  if (offset != null) allowed.set('offset', offset)
  if (limit != null) allowed.set('limit', limit)

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/catalogo/${encodeURIComponent(slug.trim())}`,
    allowed
  )
}
