import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

const BACKEND_PATH = '/api/v1/delivery/empresas/me/funcionamento/fechar'

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

/** POST /api/delivery/empresas/me/funcionamento/fechar */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(BACKEND_PATH, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        Accept: 'application/json',
      },
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    return handleApiError(error, 'Erro ao fechar loja manualmente:')
  }
}
