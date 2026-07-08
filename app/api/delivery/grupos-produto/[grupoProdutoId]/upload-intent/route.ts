import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { proxyAuthenticatedBackendPost } from '@/src/shared/utils/proxyAuthenticatedBackendRoute'

/**
 * POST /api/delivery/grupos-produto/[grupoProdutoId]/upload-intent
 * Proxy → POST /api/v1/delivery/grupos-produto/:id/upload-intent
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ grupoProdutoId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { grupoProdutoId } = await params
  if (!grupoProdutoId?.trim()) {
    return NextResponse.json({ error: 'ID do grupo de produtos é obrigatório' }, { status: 400 })
  }

  try {
    const body = await request.json()
    return proxyAuthenticatedBackendPost(
      `/api/v1/delivery/grupos-produto/${encodeURIComponent(grupoProdutoId.trim())}/upload-intent`,
      validation.tokenInfo.token,
      body,
      201
    )
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }
}
