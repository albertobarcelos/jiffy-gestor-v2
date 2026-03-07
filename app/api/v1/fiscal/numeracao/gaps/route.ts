import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { validateGapsQuery } from '@/src/server/fiscal/numeracaoOperacoesMapper'

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const queryValidation = validateGapsQuery(request.nextUrl.searchParams)
    if (!queryValidation.ok || !queryValidation.params) {
      return NextResponse.json(
        { error: queryValidation.error || 'Parâmetros inválidos' },
        { status: 400 }
      )
    }
    const params = queryValidation.params

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/fiscal/documentos/gaps?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao detectar gaps de numeração:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao detectar gaps de numeração' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
