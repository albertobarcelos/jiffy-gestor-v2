import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ modelo: string; serie: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { modelo, serie } = await params
    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/fiscal/configuracoes/numeracao/${modelo}/${serie}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao atualizar configuração de numeração:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar configuração de numeração' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
