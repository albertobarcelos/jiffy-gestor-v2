import { NextRequest } from 'next/server'
import { normalizarSlugPublico } from '@/src/application/delivery-publico/normalizarSlugPublico'
import {
  proxyPublicDeliveryPost,
  publicDeliveryOptionsResponse,
} from '@/src/infrastructure/bff/proxyPublicDeliveryRoute'

/**
 * POST /api/public/delivery/catalogo/[slug]/peca-tambem/eventos
 * Proxy público → POST /api/v1/delivery/catalogo/:slug/peca-tambem/eventos
 */
export async function OPTIONS() {
  return publicDeliveryOptionsResponse()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const slug = normalizarSlugPublico(rawSlug ?? '')
  if (!slug) {
    return Response.json({ error: 'Slug é obrigatório' }, { status: 400 })
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  return proxyPublicDeliveryPost(
    `/api/v1/delivery/catalogo/${encodeURIComponent(slug)}/peca-tambem/eventos`,
    body,
    request
  )
}
