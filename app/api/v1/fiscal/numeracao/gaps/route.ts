import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const searchParams = request.nextUrl.searchParams
    const modelo = searchParams.get('modelo')
    const serie = searchParams.get('serie')
    const numeroInicial = searchParams.get('numeroInicial')
    const numeroFinal = searchParams.get('numeroFinal')

    if (!modelo || !serie) {
      return NextResponse.json(
        { error: 'modelo e serie são obrigatórios' },
        { status: 400 }
      )
    }

    const params = new URLSearchParams({ modelo, serie })
    if (numeroInicial) params.append('numeroInicial', numeroInicial)
    if (numeroFinal) params.append('numeroFinal', numeroFinal)

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/fiscal/numeracao/gaps?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao detectar gaps de numeração:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao detectar gaps de numeração' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
