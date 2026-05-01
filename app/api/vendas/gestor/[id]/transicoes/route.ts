import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/vendas/gestor/[id]/transicoes
 * Encaminha para POST /api/v1/gestor/vendas/{id}/transicoes (ações operacionais do fluxo entrega).
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
    if (!id) {
      return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/gestor/vendas/${id}/transicoes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    console.error('Erro na transição operacional gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro na transição operacional' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
