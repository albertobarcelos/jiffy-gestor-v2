import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>('/api/v1/fiscal/empresas-fiscais', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao salvar configuração fiscal:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao salvar configuração fiscal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
