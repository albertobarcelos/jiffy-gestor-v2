import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/terminais/[id]/detalhes
 * Busca detalhes de um terminal
 */
export async function GET(
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
    if (!id) {
      return NextResponse.json({ error: 'ID do terminal é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/preferencias/terminais/${id}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return NextResponse.json(response.data || {})
  } catch (error) {
    console.error('Erro ao buscar terminal:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar terminal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

