import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { AUTH_COOKIE_TENANT, cookieOptsMaxAge } from '@/src/shared/utils/authCookies'
import {
  applyRefreshTokenMap,
  readRefreshTokenMap,
  resolveRefreshTokenForEmpresa,
} from '@/src/shared/utils/refreshTokenMap'
import { decodeToken, extractTokenInfo } from '@/src/shared/utils/validateToken'

/**
 * POST /api/auth/refresh-token
 *
 * Renova o access token:
 * - com `empresaId` no body → usa **somente** o refresh do mapa dessa empresa
 * - sem `empresaId` → cookie legado `refresh-token` (ponte do hub)
 *
 * Proxy para `POST /api/v1/auth/refresh-token` no backend.
 *
 * Body opcional: `{ empresaId?: string }`
 */
export async function POST(request: NextRequest) {
  try {
    let empresaId: string | null = null
    try {
      const body = (await request.json()) as { empresaId?: unknown }
      if (typeof body?.empresaId === 'string' && body.empresaId.length > 0) {
        empresaId = body.empresaId
      }
    } catch {
      // body vazio / não-JSON — usa cookie legado
    }

    const refreshToken = resolveRefreshTokenForEmpresa(request, empresaId)
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

    const tokenInfo = extractTokenInfo(accessToken)
    const accessEmpresaId = tokenInfo.empresaId ?? empresaId

    // Se o cliente pediu empresa X e o backend devolveu access de Y, recusa (anti-mix).
    if (empresaId && accessEmpresaId && empresaId !== accessEmpresaId) {
      return NextResponse.json(
        { error: 'Refresh retornou empresa diferente da solicitada' },
        { status: 409 }
      )
    }

    const decoded = decodeToken(accessToken)
    const maxAge = decoded?.exp
      ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 60)
      : 60 * 60 * 24

    const res = NextResponse.json({ accessToken }, { status: 200 })
    res.cookies.set(AUTH_COOKIE_TENANT, accessToken, cookieOptsMaxAge(maxAge))

    // Mantém o refresh usado no mapa (backend atual não devolve refresh novo).
    if (accessEmpresaId) {
      applyRefreshTokenMap(
        res,
        readRefreshTokenMap(request),
        accessEmpresaId,
        refreshToken,
        60 * 60 * 24 * 7
      )
    }

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
