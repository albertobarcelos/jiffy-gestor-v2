import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { buildInutilizacoesQuery } from '@/src/server/fiscal/numeracaoOperacoesMapper'

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    let url = '/api/v1/fiscal/inutilizacoes'
    const params = buildInutilizacoesQuery(request.nextUrl.searchParams)
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
