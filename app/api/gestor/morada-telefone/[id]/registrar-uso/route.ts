import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/gestor/morada-telefone/[id]/registrar-uso
 * Proxy para POST /api/v1/gestor/morada-telefone/{id}/registrar-uso — atualiza última utilização (ordem “recentes”).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID da morada é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    await apiClient.request<unknown>(
      `/api/v1/gestor/morada-telefone/${encodeURIComponent(id)}/registrar-uso`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erro ao registrar uso da morada:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: mensagemLegivelApiError(error),
          details: error.data,
        },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
