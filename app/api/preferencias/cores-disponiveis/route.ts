import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET - Lista de cores disponíveis para seleção
 */
export async function GET(req: NextRequest) {
  const validation = validateRequest(req)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  try {
    const apiClient = new ApiClient()
    const { token } = validation.tokenInfo

    const response = await apiClient.request<string[]>(
      '/api/v1/preferencias/cores-disponiveis',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const cores = Array.isArray(response.data) ? response.data : []

    return NextResponse.json(
      { success: true, cores },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('Erro ao buscar cores disponíveis:', error)

    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message || 'Erro ao buscar cores disponíveis' },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json(
      { message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

