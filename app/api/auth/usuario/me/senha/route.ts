import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { senhaGestorEhValida, SENHA_GESTOR_MENSAGEM_ERRO } from '@/src/shared/utils/senhaGestorRules'

const bodySchema = z
  .object({ password: z.string() })
  .superRefine((data, ctx) => {
    if (!senhaGestorEhValida(data.password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: SENHA_GESTOR_MENSAGEM_ERRO,
        path: ['password'],
      })
    }
  })

/**
 * PATCH /api/auth/usuario/me/senha
 * Proxy para PATCH /api/v1/usuarios/me/senha (senha global; token de identidade ou tenant).
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
      const msg = parsed.error.flatten().fieldErrors.password?.[0] ?? 'Dados inválidos'
      return NextResponse.json({ message: msg }, { status: 400 })
    }

    const apiUrl = (process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL ?? '').replace(/\/$/, '')
    if (!apiUrl) {
      return NextResponse.json(
        { message: 'NEXT_PUBLIC_EXTERNAL_API_BASE_URL não configurada' },
        { status: 500 }
      )
    }

    const upstream = await fetch(`${apiUrl}/api/v1/usuarios/me/senha`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: parsed.data.password }),
    })

    if (!upstream.ok) {
      const errorData = await upstream.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || 'Erro ao atualizar senha',
        upstream.status,
        errorData
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ApiError) {
      const extra =
        error.data && typeof error.data === 'object' && !Array.isArray(error.data)
          ? (error.data as Record<string, unknown>)
          : {}
      return NextResponse.json({ message: error.message, ...extra }, { status: error.status })
    }
    console.error('[PATCH /api/auth/usuario/me/senha]', error)
    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
