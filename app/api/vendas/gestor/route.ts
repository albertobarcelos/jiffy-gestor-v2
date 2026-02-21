import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * POST /api/vendas/gestor
 * Cria uma nova venda no gestor (tabela venda_gestor)
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
    const response = await apiClient.request<any>(
      '/api/v1/gestor/vendas',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data || {}, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar venda gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao criar venda gestor' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
