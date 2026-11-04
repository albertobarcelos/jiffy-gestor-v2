import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

const BACKEND_PATH = '/api/v1/delivery/empresas/me/design/draft'

export async function PUT(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(BACKEND_PATH, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    console.error('Erro ao salvar draft de design delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
