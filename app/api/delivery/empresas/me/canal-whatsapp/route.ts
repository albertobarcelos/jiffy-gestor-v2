import { NextRequest } from 'next/server'
import { proxyCanalWhatsApp } from './_proxy'

/** GET /api/delivery/empresas/me/canal-whatsapp */
export async function GET(request: NextRequest) {
  return proxyCanalWhatsApp(request, {
    method: 'GET',
    logContext: 'GET canal-whatsapp',
  })
}

/** PUT /api/delivery/empresas/me/canal-whatsapp — cria/substitui instância e devolve QR. */
export async function PUT(request: NextRequest) {
  return proxyCanalWhatsApp(request, {
    method: 'PUT',
    logContext: 'PUT canal-whatsapp',
  })
}

/** DELETE /api/delivery/empresas/me/canal-whatsapp */
export async function DELETE(request: NextRequest) {
  return proxyCanalWhatsApp(request, {
    method: 'DELETE',
    logContext: 'DELETE canal-whatsapp',
  })
}
