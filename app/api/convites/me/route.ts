import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'
import { ListarConvitesPendentesResponseSchema } from '@/src/application/dto/convites/ConvitesDTO'

/**
 * BFF: Lista convites pendentes do usuário autenticado
 * GET /api/convites/me
 */
export async function GET(request: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(request)
    if (!tokenInfo) {
      return NextResponse.json({ error: 'Token não encontrado' }, { status: 401 })
    }
    const token = tokenInfo.token

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/convites/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })

    const parsed = ListarConvitesPendentesResponseSchema.parse(response.data)
    return NextResponse.json(parsed, { status: 200 })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message || 'Erro ao buscar convites' }, { status: error.status })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Resposta inválida do servidor' }, { status: 502 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

