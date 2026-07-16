import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

type RouteContext = { params: Promise<{ exportacaoId: string }> }

/**
 * GET /api/v1/fiscal/exportacao/xmls/[exportacaoId]/status
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const validation = validateRequest(_request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { exportacaoId } = await context.params

    if (!exportacaoId) {
      return NextResponse.json({ error: 'exportacaoId é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      `/api/v1/fiscal/exportacao/xmls/${encodeURIComponent(exportacaoId)}/status`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('[Exportacao XML] Erro ao consultar status:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao consultar status da exportação' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
