import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'

const optionalNullableString = (max: number) =>
  z.union([z.string().max(max), z.null()]).optional()

const patchBodySchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório').max(255, 'Nome muito longo').optional(),
    apelido: optionalNullableString(100),
    dataNascimento: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
        z.null(),
      ])
      .optional(),
    telefone: optionalNullableString(15),
    departamento: optionalNullableString(100),
    cidade: optionalNullableString(100),
    estado: z
      .union([
        z.string().regex(/^[A-Za-z]{2}$/, 'Estado deve ser a sigla UF com 2 letras'),
        z.null(),
      ])
      .optional(),
  })
  .strict()

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ?? '').replace(/\/$/, '')
}

async function proxyUsuarioMe(
  accessToken: string,
  init: RequestInit
): Promise<{ status: number; data: unknown }> {
  const apiUrl = getApiBaseUrl()
  if (!apiUrl) {
    throw new ApiError('NEXT_PUBLIC_EXTERNAL_API_BASE_URL não configurada', 500)
  }

  const upstream = await fetch(`${apiUrl}/api/v1/usuarios/me`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
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

  return { status: upstream.status, data }
}

/**
 * GET /api/auth/usuario/me
 * Proxy para GET /api/v1/usuarios/me (perfil global; token de identidade ou tenant).
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request, { requireEmpresaId: false })
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { status, data } = await proxyUsuarioMe(validation.tokenInfo.token, {
      method: 'GET',
    })

    return NextResponse.json(data, { status })
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
    const parsed = patchBodySchema.safeParse(json)
    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors
      const msg =
        Object.values(firstError).flat()[0] ?? 'Dados inválidos'
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    const body: Record<string, unknown> = {}
    if (parsed.data.nome !== undefined) body.nome = parsed.data.nome.trim()
    if (parsed.data.apelido !== undefined) body.apelido = parsed.data.apelido
    if (parsed.data.dataNascimento !== undefined) body.dataNascimento = parsed.data.dataNascimento
    if (parsed.data.telefone !== undefined) body.telefone = parsed.data.telefone
    if (parsed.data.departamento !== undefined) body.departamento = parsed.data.departamento
    if (parsed.data.cidade !== undefined) body.cidade = parsed.data.cidade
    if (parsed.data.estado !== undefined) body.estado = parsed.data.estado

    const { status, data } = await proxyUsuarioMe(validation.tokenInfo.token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    return NextResponse.json(data, { status })
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
