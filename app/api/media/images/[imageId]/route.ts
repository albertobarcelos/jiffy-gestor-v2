import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { proxyAuthenticatedBackendDelete } from '@/src/shared/utils/proxyAuthenticatedBackendRoute'

/**
 * DELETE /api/media/images/[imageId]
 * Proxy → DELETE /api/v1/media/images/:imageId
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ imageId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { imageId } = await params
  if (!imageId?.trim()) {
    return NextResponse.json({ error: 'ID da imagem é obrigatório' }, { status: 400 })
  }

  return proxyAuthenticatedBackendDelete(
    `/api/v1/media/images/${encodeURIComponent(imageId.trim())}`,
    validation.tokenInfo.token
  )
}
