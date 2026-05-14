import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ConviteGestaoSchema } from '@/src/application/dto/convites/ConvitesGestaoDTO'

/**
 * BFF: Reenvia convite (renova prazo e tenta e-mail).
 * POST /api/convites/:id/reenviar → POST /api/v1/convites/:id/reenviar
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { id } = await ctx.params
    if (!id) {
      return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/convites/${encodeURIComponent(id)}/reenviar`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${validation.tokenInfo.token}` },
      }
    )

    const parsed = ConviteGestaoSchema.parse(response.data)
    return NextResponse.json(parsed, { status: 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao reenviar convite' }, { status: error.status })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Resposta inválida do servidor' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
