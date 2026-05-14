import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  AUTH_COOKIE_REFRESH,
  AUTH_COOKIE_TENANT,
  cookieOptsMaxAge,
} from '@/src/shared/utils/authCookies'
import { decodeToken } from '@/src/shared/utils/validateToken'

/**
 * POST /api/auth/refresh-token
 *
 * Renova o access token usando o refresh token armazenado em cookie httpOnly.
 * Proxy para `POST /api/v1/auth/refresh-token` no backend.
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(AUTH_COOKIE_REFRESH)?.value
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token ausente' }, { status: 401 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<{ accessToken: string }>(
      '/api/v1/auth/refresh-token',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    )

    const { accessToken } = response.data
    if (!accessToken) {
      return NextResponse.json({ error: 'Resposta sem accessToken' }, { status: 502 })
    }

    const decoded = decodeToken(accessToken)
    const maxAge = decoded?.exp
      ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 60)
      : 60 * 60 * 24

    const res = NextResponse.json({ accessToken }, { status: 200 })
    res.cookies.set(AUTH_COOKIE_TENANT, accessToken, cookieOptsMaxAge(maxAge))
    return res
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao renovar token' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
