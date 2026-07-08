import { NextResponse } from 'next/server'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

export function authJsonHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

export function handleAuthenticatedBackendError(
  error: unknown,
  context: string
): NextResponse {
  console.error(context, error)
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: mensagemLegivelApiError(error), details: error.data },
      { status: error.status }
    )
  }
  return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
}

export async function proxyAuthenticatedBackendPost(
  upstreamPath: string,
  token: string,
  body: unknown,
  defaultStatus = 201
): Promise<NextResponse> {
  try {
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(upstreamPath, {
      method: 'POST',
      headers: authJsonHeaders(token),
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, {
      status: response.status || defaultStatus,
    })
  } catch (error) {
    return handleAuthenticatedBackendError(error, `Erro no proxy POST ${upstreamPath}:`)
  }
}
