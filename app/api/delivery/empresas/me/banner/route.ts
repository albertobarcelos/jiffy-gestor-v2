import { NextRequest } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { proxyAuthenticatedBackendDelete } from '@/src/shared/utils/proxyAuthenticatedBackendRoute'

/**
 * DELETE /api/delivery/empresas/me/banner
 * Proxy → DELETE /api/v1/delivery/empresas/me/banner
 */
export async function DELETE(request: NextRequest) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  return proxyAuthenticatedBackendDelete(
    '/api/v1/delivery/empresas/me/banner',
    validation.tokenInfo.token
  )
}
