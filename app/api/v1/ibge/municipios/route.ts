import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

/**
 * GET /api/v1/ibge/municipios?uf=SP
 * Lista todos os municípios de um estado
 */
export async function GET(request: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(request)
    if (!tokenInfo) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uf = searchParams.get('uf')

    if (!uf) {
      return NextResponse.json(
        { error: 'UF é obrigatório' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/ibge/municipios?uf=${uf}`,
      {
        method: 'GET',
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao listar municípios:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao listar municípios' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
