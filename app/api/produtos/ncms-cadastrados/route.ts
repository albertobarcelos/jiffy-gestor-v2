import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

/**
 * GET /api/produtos/ncms-cadastrados
 * Lista NCMs distintos já cadastrados nos produtos da empresa.
 */
export async function GET(req: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const apiClient = new ApiClient()
    const { data } = await apiClient.request<{ ncms: string[] }>(
      '/api/v1/cardapio/produtos/ncms-cadastrados',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(
      {
        success: true,
        ncms: Array.isArray(data.ncms) ? data.ncms : [],
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: unknown) {
    console.error('Erro na API de NCMs cadastrados:', error)

    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message || 'Erro ao listar NCMs cadastrados' },
        { status: error.status }
      )
    }

    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
