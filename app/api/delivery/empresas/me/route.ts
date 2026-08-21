import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

const BACKEND_PATH = '/api/v1/delivery/empresas/me'

function authHeaders(token: string, contentType = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
  if (contentType) {
    headers['Content-Type'] = 'application/json'
  }
  return headers
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

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(BACKEND_PATH, {
      method: 'GET',
      headers: authHeaders(validation.tokenInfo.token),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    return handleApiError(error, 'Erro ao buscar empresa delivery:')
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(BACKEND_PATH, {
      method: 'POST',
      headers: authHeaders(validation.tokenInfo.token, true),
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 201 })
  } catch (error) {
    return handleApiError(error, 'Erro ao criar empresa delivery:')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(BACKEND_PATH, {
      method: 'PATCH',
      headers: authHeaders(validation.tokenInfo.token, true),
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    return handleApiError(error, 'Erro ao atualizar empresa delivery:')
  }
}
