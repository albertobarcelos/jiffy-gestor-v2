import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/v1/fiscal/produtos-fiscais/batch
 * Busca informações fiscais de múltiplos produtos em uma única chamada.
 * Frontend → Next BFF → jiffy-backend → FiscalGateway → FiscalService
 *
 * Body: { produtoIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    if (!body || !Array.isArray(body.produtoIds)) {
      return NextResponse.json(
        { message: 'Body deve conter produtoIds (array)' },
        { status: 400 }
      )
    }

    if (body.produtoIds.length === 0) {
      return NextResponse.json({ produtos: [], total: 0 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<{
      produtos?: unknown[]
      total?: number
    }>('/api/v1/fiscal/produtos-fiscais/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify({ produtoIds: body.produtoIds }),
    })

    const data = response.data ?? {}
    return NextResponse.json({
      produtos: Array.isArray(data.produtos) ? data.produtos : [],
      total: typeof data.total === 'number' ? data.total : (data.produtos?.length ?? 0),
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message || 'Erro ao buscar produtos fiscais em batch' },
        { status: error.status }
      )
    }
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
