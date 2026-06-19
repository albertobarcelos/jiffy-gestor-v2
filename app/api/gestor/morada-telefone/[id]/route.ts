import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * PATCH /api/gestor/morada-telefone/[id]
 * Actualiza morada (telefone, etiqueta, nome, endereco).
 */
export async function PATCH(
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

    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/gestor/morada-telefone/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    console.error('Erro ao atualizar morada por telefone:', error)
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
