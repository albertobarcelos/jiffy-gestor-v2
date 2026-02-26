import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

type ApiErrorData = {
  message?: string
  error?: string
  codigo?: string
  codigoErro?: string
  codigoRejeicao?: string
  categoria?: string
}

/**
 * POST /api/vendas/gestor/[id]/reemitir
 * Reemite nota fiscal para uma venda do gestor rejeitada
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

    const response = await apiClient.request<any>(
      `/api/v1/gestor/vendas/${id}/reemitir`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data || {}, { status: response.status })
  } catch (error) {
    if (error instanceof ApiError) {
      const errorData =
        error.data && typeof error.data === 'object'
          ? (error.data as ApiErrorData)
          : {}

      return NextResponse.json(
        {
          error: error.message || errorData.message || errorData.error || 'Erro ao reemitir nota fiscal',
          codigo: errorData.codigo ?? errorData.codigoErro ?? null,
          codigoRejeicao: errorData.codigoRejeicao ?? null,
          categoria: errorData.categoria ?? null,
        },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
