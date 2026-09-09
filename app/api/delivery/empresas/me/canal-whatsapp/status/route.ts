import { NextRequest } from 'next/server'
import { proxyCanalWhatsApp } from '../_proxy'

/** GET /api/delivery/empresas/me/canal-whatsapp/status */
export async function GET(request: NextRequest) {
  return proxyCanalWhatsApp(request, {
    method: 'GET',
    suffix: '/status',
    logContext: 'GET canal-whatsapp/status',
  })
}
