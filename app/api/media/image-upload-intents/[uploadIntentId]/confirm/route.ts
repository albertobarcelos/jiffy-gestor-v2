import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { proxyAuthenticatedBackendPost } from '@/src/shared/utils/proxyAuthenticatedBackendRoute'

/**
 * POST /api/media/image-upload-intents/[uploadIntentId]/confirm
 * Proxy → POST /api/v1/media/image-upload-intents/:id/confirm
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadIntentId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { uploadIntentId } = await params
  if (!uploadIntentId?.trim()) {
    return NextResponse.json({ error: 'ID da intenção de upload é obrigatório' }, { status: 400 })
  }

  return proxyAuthenticatedBackendPost(
    `/api/v1/media/image-upload-intents/${encodeURIComponent(uploadIntentId.trim())}/confirm`,
    validation.tokenInfo.token,
    {},
    200
  )
}
