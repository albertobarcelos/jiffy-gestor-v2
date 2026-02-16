import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/v1/ibge/municipios/buscar?uf=SP&nome=São
 * Busca municípios por nome (autocomplete)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uf = searchParams.get('uf')
    const nome = searchParams.get('nome')

    if (!uf || !nome) {
      return NextResponse.json(
        { error: 'UF e nome são obrigatórios' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/ibge/municipios/buscar?uf=${uf}&nome=${encodeURIComponent(nome)}`,
      {
        method: 'GET',
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar municípios:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar municípios' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
