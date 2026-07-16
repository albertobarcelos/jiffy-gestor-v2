import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/v1/fiscal/exportacao/xmls/historico
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') ?? '0'
    const size = searchParams.get('size') ?? '20'
    const params = new URLSearchParams({ page, size })

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      `/api/v1/fiscal/exportacao/xmls/historico?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('[Exportacao XML] Erro ao listar histórico:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao listar histórico de exportações' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
