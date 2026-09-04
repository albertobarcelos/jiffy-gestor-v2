import { NextRequest } from 'next/server'
import { proxyPublicDeliveryGet } from '@/src/shared/utils/proxyPublicDeliveryRoute'

/**
 * GET /api/delivery/catalogo-empresa/[slug]
 * Hydrate de logo/banner no Design (admin). Proxy autenticado → catálogo público upstream.
 * A loja do cliente vive em apps/jiffy-cardapio; esta rota não substitui o BFF público.
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
