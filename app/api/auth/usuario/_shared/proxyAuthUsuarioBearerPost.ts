import { NextResponse } from 'next/server'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/** Extrai o JWT de `Authorization: Bearer <token>`. */
export function extrairBearerAuthorization(authorization: string | null): string | null {
  if (!authorization?.trim()) return null
  const m = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  const t = m?.[1]?.trim()
  return t || null
}

/**
 * Encaminha POST ao upstream com `Authorization: Bearer` (sem token no corpo).
 * `body` omitido = requisição sem corpo JSON.
 */
export async function proxyAuthUsuarioBearerPost(
  upstreamPath: string,
  bearerToken: string,
  body?: unknown
): Promise<NextResponse> {
  try {
    const token = bearerToken.trim()
    if (!token) {
      return NextResponse.json({ error: 'Token ausente' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }
    const init: RequestInit = {
      method: 'POST',
      headers,
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    const { data, status } = await apiClient.request<unknown>(upstreamPath, init)

    if (status === 204) {
      return new NextResponse(null, { status: 204 })
    }

    if (status === 201) {
      return NextResponse.json(data ?? {}, { status: 201 })
    }

    return NextResponse.json(data ?? {}, { status })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
