import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * BFF: Cancela convite pendente.
 * DELETE /api/convites/:id → DELETE /api/v1/convites/:id
 */
export async function DELETE(
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
    await apiClient.request<unknown>(`/api/v1/convites/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${validation.tokenInfo.token}` },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao cancelar convite' }, { status: error.status })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
