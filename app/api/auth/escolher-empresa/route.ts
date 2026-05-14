import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import {
  AUTH_COOKIE_IDENTITY,
  AUTH_COOKIE_LEGACY,
  AUTH_COOKIE_REFRESH,
  AUTH_COOKIE_TENANT,
  cookieOptsMaxAge,
} from '@/src/shared/utils/authCookies'
import { decodeToken } from '@/src/shared/utils/validateToken'
import {
  EscolherEmpresaRequestSchema,
  EscolherEmpresaResponseSchema,
} from '@/src/application/dto/auth/EscolherEmpresaDTO'

/**
 * BFF: Abre sessão na empresa selecionada (multi-empresa)
 * POST /api/auth/escolher-empresa
 */
function getIdentityTokenParaEscolherEmpresa(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const t = authHeader.substring(7).trim()
    if (t.length > 0) {
      return t
    }
  }
  return (
    request.cookies.get(AUTH_COOKIE_IDENTITY)?.value ??
    request.cookies.get(AUTH_COOKIE_LEGACY)?.value ??
    null
  )
}

export async function POST(request: NextRequest) {
  try {
    const token = getIdentityTokenParaEscolherEmpresa(request)
    if (!token) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 })
    }

    const body = await request.json()
    const validated = EscolherEmpresaRequestSchema.parse(body)

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/auth/escolher-empresa', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(validated),
    })

    const parsed = EscolherEmpresaResponseSchema.parse(response.data)

    const decoded = decodeToken(parsed.accessToken)
    const accessMaxAge = decoded?.exp
      ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 60)
      : 60 * 60 * 24

    const refreshDecoded = decodeToken(parsed.refreshToken)
    const refreshMaxAge = refreshDecoded?.exp
      ? Math.max(refreshDecoded.exp - Math.floor(Date.now() / 1000), 60)
      : 60 * 60 * 24 * 7

    const res = NextResponse.json(parsed, { status: 200 })
    res.cookies.set(AUTH_COOKIE_TENANT, parsed.accessToken, cookieOptsMaxAge(accessMaxAge))
    res.cookies.set(AUTH_COOKIE_REFRESH, parsed.refreshToken, cookieOptsMaxAge(refreshMaxAge))
    return res
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao escolher empresa' }, { status: error.status })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

