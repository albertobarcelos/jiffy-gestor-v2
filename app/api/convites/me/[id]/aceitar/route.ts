import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { getAuthToken } from '@/src/shared/utils/getAuthToken'

/**
 * BFF: Aceita convite pendente
 * POST /api/convites/me/:id/aceitar
 */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const token = getAuthToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 })
    }

    const { id } = await ctx.params
    if (!id) {
      return NextResponse.json({ error: 'Parâmetro id é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(`/api/v1/convites/me/${encodeURIComponent(id)}/aceitar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    return NextResponse.json(response.data ?? { success: true }, { status: response.status || 201 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao aceitar convite' }, { status: error.status })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

