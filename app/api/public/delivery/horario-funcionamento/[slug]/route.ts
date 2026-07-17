import { proxyPublicDeliveryGet } from '@/src/shared/utils/proxyPublicDeliveryRoute'

/**
 * GET /api/public/delivery/horario-funcionamento/[slug]
 * Proxy público → GET /api/v1/delivery/horario-funcionamento/:slug
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!slug?.trim()) {
    return Response.json({ error: 'Slug é obrigatório' }, { status: 400 })
  }

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/horario-funcionamento/${encodeURIComponent(slug.trim())}`
  )
}
