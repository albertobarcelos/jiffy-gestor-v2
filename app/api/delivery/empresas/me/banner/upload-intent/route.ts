import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { proxyAuthenticatedBackendPost } from '@/src/shared/utils/proxyAuthenticatedBackendRoute'

/**
 * POST /api/delivery/empresas/me/banner/upload-intent
 * Proxy → POST /api/v1/delivery/empresas/me/banner/upload-intent
 */
export async function POST(request: NextRequest) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  try {
    const body = await request.json()
    return proxyAuthenticatedBackendPost(
      '/api/v1/delivery/empresas/me/banner/upload-intent',
      validation.tokenInfo.token,
      body,
      201
    )
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }
}
