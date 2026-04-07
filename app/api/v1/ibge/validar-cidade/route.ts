import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/v1/ibge/validar-cidade?cidade=São Paulo&uf=SP
 * Valida se uma cidade existe no estado informado
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cidade = searchParams.get('cidade')
    const uf = searchParams.get('uf')

    if (!cidade || !uf) {
      return NextResponse.json(
        { error: 'Cidade e UF são obrigatórios' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/ibge/validar-cidade?cidade=${encodeURIComponent(cidade)}&uf=${uf}`,
      {
        method: 'GET',
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao validar cidade:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao validar cidade' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
