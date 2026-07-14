import { NextRequest } from 'next/server'
import { proxyPublicDeliveryPost } from '@/src/shared/utils/proxyPublicDeliveryRoute'

/**
 * POST /api/public/delivery/clientes
 * Proxy público → POST /api/v1/delivery/clientes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    return proxyPublicDeliveryPost('/api/v1/delivery/clientes', body)
  } catch {
    return Response.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }
}
