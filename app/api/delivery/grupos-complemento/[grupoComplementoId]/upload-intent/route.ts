import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { proxyAuthenticatedBackendPost } from '@/src/shared/utils/proxyAuthenticatedBackendRoute'

/**
 * POST /api/delivery/grupos-complemento/[grupoComplementoId]/upload-intent
 * Proxy → POST /api/v1/delivery/grupos-complemento/:id/upload-intent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ grupoComplementoId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { grupoComplementoId } = await params
  if (!grupoComplementoId?.trim()) {
    return NextResponse.json(
      { error: 'ID do grupo de complementos é obrigatório' },
      { status: 400 }
    )
  }

  try {
    const body = await request.json()
    return proxyAuthenticatedBackendPost(
      `/api/v1/delivery/grupos-complemento/${encodeURIComponent(grupoComplementoId.trim())}/upload-intent`,
      validation.tokenInfo.token,
      body,
      201
    )
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }
}
