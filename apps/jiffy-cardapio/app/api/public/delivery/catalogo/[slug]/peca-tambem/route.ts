import { NextRequest } from 'next/server'
import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'
import { proxyPublicDeliveryGet } from '@/src/infrastructure/bff/proxyPublicDeliveryRoute'

/**
 * GET /api/public/delivery/catalogo/[slug]/peca-tambem
 * Proxy público → GET /api/v1/delivery/catalogo/:slug/peca-tambem
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
  const grupoIds = searchParams.get('grupoIds')
  const excludeProdutoIds = searchParams.get('excludeProdutoIds')
  if (grupoIds != null) allowed.set('grupoIds', grupoIds)
  if (excludeProdutoIds != null) allowed.set('excludeProdutoIds', excludeProdutoIds)

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/catalogo/${encodeURIComponent(slug)}/peca-tambem`,
    allowed
  )
}
