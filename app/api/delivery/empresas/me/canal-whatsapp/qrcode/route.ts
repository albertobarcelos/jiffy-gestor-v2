import { NextRequest } from 'next/server'
import { proxyCanalWhatsApp } from '../_proxy'

/** GET /api/delivery/empresas/me/canal-whatsapp/qrcode */
export async function GET(request: NextRequest) {
  return proxyCanalWhatsApp(request, {
    method: 'GET',
    suffix: '/qrcode',
    logContext: 'GET canal-whatsapp/qrcode',
  })
}
