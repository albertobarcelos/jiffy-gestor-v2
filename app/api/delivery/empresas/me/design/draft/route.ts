import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

const BACKEND_PATH = '/api/v1/delivery/empresas/me/design/draft'

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error)
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: mensagemLegivelApiError(error), details: error.data },
      { status: error.status }
    )
  }
  return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
}

export async function PUT(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(BACKEND_PATH, {
      method: 'PUT',
      headers: authHeaders(validation.tokenInfo.token),
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    return handleApiError(error, 'Erro ao atualizar draft do design delivery:')
  }
}
