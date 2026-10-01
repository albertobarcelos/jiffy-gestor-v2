import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'
import { proxyPublicDeliveryGet } from '@/src/infrastructure/bff/proxyPublicDeliveryRoute'

/**
 * GET /api/public/delivery/meios-pagamento/[slug]
 * Proxy público → GET /api/v1/delivery/meios-pagamento/:slug
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = normalizarSlugPublico(rawSlug ?? '')
  if (!slug) {
    return Response.json({ error: 'Slug é obrigatório' }, { status: 400 })
  }

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/meios-pagamento/${encodeURIComponent(slug)}`,
    undefined,
    { incoming: request }
  )
}
