import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/caixa/operacao-caixa-terminal/[id]
 * Busca detalhes de uma operação de caixa específica
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
      return NextResponse.json({ error: 'ID da operação de caixa é obrigatório' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const tipoRetorno = searchParams.get('tipoRetorno') || 'detalhado'

    const apiClient = new ApiClient()
    const paramsQuery = new URLSearchParams()
    if (tipoRetorno) {
      paramsQuery.append('tipoRetorno', tipoRetorno)
    }

    const response = await apiClient.request<any>(
      `/api/v1/caixa/operacao-caixa-terminal/${id}?${paramsQuery.toString()}`,
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
    console.error('Erro ao buscar detalhes da operação de caixa:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar detalhes da operação de caixa' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

