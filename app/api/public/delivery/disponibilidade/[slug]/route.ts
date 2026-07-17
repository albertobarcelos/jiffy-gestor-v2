import { proxyPublicDeliveryGet } from '@/src/shared/utils/proxyPublicDeliveryRoute'

/**
 * GET /api/public/delivery/disponibilidade/[slug]
 * Proxy público → GET /api/v1/delivery/disponibilidade/:slug
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!slug?.trim()) {
    return Response.json({ error: 'Slug é obrigatório' }, { status: 400 })
  }

  const url = new URL(request.url)
  const searchParams = new URLSearchParams()
  const tipoEntrega = url.searchParams.get('tipoEntrega')
  const data = url.searchParams.get('data')

  if (tipoEntrega) searchParams.set('tipoEntrega', tipoEntrega)
  if (data) searchParams.set('data', data)

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/disponibilidade/${encodeURIComponent(slug.trim())}`,
    searchParams
  )
}
