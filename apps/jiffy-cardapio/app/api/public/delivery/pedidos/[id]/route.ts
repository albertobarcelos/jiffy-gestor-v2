import { NextRequest } from 'next/server'
import { proxyPublicDeliveryGet } from '@/src/infrastructure/bff/proxyPublicDeliveryRoute'

/**
 * GET /api/public/delivery/pedidos/[id]
 * Proxy público → GET /api/v1/delivery/pedidos/publico/:id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const idNormalizado = id?.trim() ?? ''
  if (!idNormalizado) {
    return Response.json({ error: 'Id do pedido é obrigatório' }, { status: 400 })
  }

  return proxyPublicDeliveryGet(
    `/api/v1/delivery/pedidos/publico/${encodeURIComponent(idNormalizado)}`,
    undefined,
    { incoming: request }
  )
}
