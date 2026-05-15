import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'

const bodySchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome muito longo'),
})

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

    const { token: accessToken } = validation.tokenInfo
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.nome?.[0] ?? 'Dados inválidos'
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    const apiUrl = (process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ?? '').replace(/\/$/, '')
    if (!apiUrl) {
      return NextResponse.json(
        { message: 'NEXT_PUBLIC_EXTERNAL_API_BASE_URL não configurada' },
        { status: 500 }
      )
    }

    const upstream = await fetch(`${apiUrl}/api/v1/usuarios/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ nome: parsed.data.nome.trim() }),
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
          : 'Erro ao atualizar dados do utilizador'
      throw new ApiError(msg, upstream.status, errorData)
    }

    let data: unknown = {}
    try {
      data = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      data = {}
    }
    return NextResponse.json(data, { status: upstream.status })
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
