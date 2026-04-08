import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/vendas/gestor/[id]/cancelar-nota
 * Cancela a nota fiscal vinculada a uma venda do gestor.
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
    const justificativa = String(body?.justificativa ?? '').trim()
    if (justificativa.length < 15) {
      return NextResponse.json(
        { error: 'Justificativa deve ter no mínimo 15 caracteres' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/gestor/vendas/${id}/cancelar-nota`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ justificativa }),
    })

    return NextResponse.json(
      response.data || { message: 'Nota fiscal cancelada com sucesso' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao cancelar nota fiscal da venda gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao cancelar nota fiscal' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
