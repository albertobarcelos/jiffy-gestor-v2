import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/gestor/morada-telefone?telefone=...
 * Lista moradas ativas da empresa para o telefone informado.
 * Retorna array vazio quando não há moradas cadastradas.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const telefone = searchParams.get('telefone')
    if (!telefone) {
      return NextResponse.json({ error: 'Parâmetro telefone é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/gestor/morada-telefone?telefone=${encodeURIComponent(telefone)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return NextResponse.json(response.data || [])
  } catch (error) {
    console.error('Erro ao buscar moradas por telefone:', error)
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

/**
 * POST /api/gestor/morada-telefone
 * Cria uma morada reutilizável para o par empresa + telefone normalizado.
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>('/api/v1/gestor/morada-telefone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data || {})
  } catch (error) {
    console.error('Erro ao criar morada por telefone:', error)
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
