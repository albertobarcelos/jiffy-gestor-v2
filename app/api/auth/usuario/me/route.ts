import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'

const bodySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
})

function upstreamBaseUrl(): string | null {
  const apiUrl = (process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ?? '').replace(/\/$/, '')
  return apiUrl || null
}

async function proxyUsuariosMe(
  accessToken: string,
  init: RequestInit
): Promise<NextResponse> {
  const apiUrl = upstreamBaseUrl()
  if (!apiUrl) {
    return NextResponse.json(
      { message: 'NEXT_PUBLIC_EXTERNAL_API_BASE_URL não configurada' },
      { status: 500 }
    )
  }

  const upstream = await fetch(`${apiUrl}/api/v1/usuarios/me`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const rawBody = await upstream.text()
  if (!upstream.ok) {
    let errorData: Record<string, unknown> = {}
    try {
      errorData = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {}
    } catch {
      errorData = {}
    }
    const msg =
      typeof errorData.message === 'string'
        ? errorData.message
        : 'Erro ao processar dados do utilizador'
    throw new ApiError(msg, upstream.status, errorData)
  }

  let data: unknown = {}
  try {
    data = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    data = {}
  }
  return NextResponse.json(data, { status: upstream.status })
}

/**
 * GET /api/auth/usuario/me
 * Proxy para GET /api/v1/usuarios/me (perfil global; identity ou access).
 * `username` no contrato é o e-mail do utilizador.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request, { requireEmpresaId: false })
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    return await proxyUsuariosMe(validation.tokenInfo.token, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      const extra =
        error.data && typeof error.data === 'object' && !Array.isArray(error.data)
          ? (error.data as Record<string, unknown>)
          : {}
      return NextResponse.json({ message: error.message, ...extra }, { status: error.status })
    }
    console.error('[GET /api/auth/usuario/me]', error)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/auth/usuario/me
 * Proxy para PATCH /api/v1/usuarios/me (dados globais; token de identidade ou tenant).
 */
export async function PATCH(request: NextRequest) {
  try {
    const validation = validateRequest(request, { requireEmpresaId: false })
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.nome?.[0] ?? 'Dados inválidos'
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    return await proxyUsuariosMe(validation.tokenInfo.token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: parsed.data.nome.trim() }),
    })
  } catch (error) {
    if (error instanceof ApiError) {
      const extra =
        error.data && typeof error.data === 'object' && !Array.isArray(error.data)
          ? (error.data as Record<string, unknown>)
          : {}
      return NextResponse.json({ message: error.message, ...extra }, { status: error.status })
    }
    console.error('[PATCH /api/auth/usuario/me]', error)
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
