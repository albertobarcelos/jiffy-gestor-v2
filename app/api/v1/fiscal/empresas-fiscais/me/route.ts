import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const apiClient = new ApiClient()
    // Segurança: empresaId é extraído do JWT pelo backend, não mais passado na URL
    const response = await apiClient.request<any>(
      `/api/v1/fiscal/empresas-fiscais/me`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar configuração fiscal:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar configuração fiscal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
