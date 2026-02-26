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
    const status = searchParams.get('status')

    let url = '/api/v1/fiscal/inutilizacoes'
    const params = new URLSearchParams()
    if (modelo) params.append('modelo', modelo)
    if (serie) params.append('serie', serie)
    if (status) params.append('status', status)
    if (params.toString()) url += `?${params.toString()}`

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar histórico de inutilizações:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar histórico de inutilizações' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
