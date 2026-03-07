import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { buildInutilizarQueryFromBody } from '@/src/server/fiscal/numeracaoOperacoesMapper'

export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    const params = buildInutilizarQueryFromBody(body)

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/fiscal/inutilizar?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao inutilizar numeração:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao inutilizar numeração' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
