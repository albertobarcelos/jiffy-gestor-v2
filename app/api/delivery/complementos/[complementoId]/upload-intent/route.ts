import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { proxyAuthenticatedBackendPost } from '@/src/shared/utils/proxyAuthenticatedBackendRoute'

/**
 * POST /api/delivery/complementos/[complementoId]/upload-intent
 * Proxy → POST /api/v1/delivery/complementos/:id/upload-intent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ complementoId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { complementoId } = await params
  if (!complementoId?.trim()) {
    return NextResponse.json({ error: 'ID do complemento é obrigatório' }, { status: 400 })
  }

  try {
    const body = await request.json()
    return proxyAuthenticatedBackendPost(
      `/api/v1/delivery/complementos/${encodeURIComponent(complementoId.trim())}/upload-intent`,
      validation.tokenInfo.token,
      body,
      201
    )
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }
}
