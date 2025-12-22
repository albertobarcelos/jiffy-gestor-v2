import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/caixa/operacao-caixa-terminal
 * Lista operações de caixa com paginação e filtros
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    
    // Parâmetros de paginação
    const limit = searchParams.get('limit') || '10'
    const offset = searchParams.get('offset') || '0'
    
    // Parâmetros de filtro
    const q = searchParams.get('q') || ''
    const dataAberturaInicio = searchParams.get('dataAberturaInicio') || ''
    const dataAberturaFim = searchParams.get('dataAberturaFim') || ''
    const terminalId = searchParams.get('terminalId') || ''
    const status = searchParams.get('status') || ''

    const apiClient = new ApiClient()
    const params = new URLSearchParams({
      limit,
      offset,
    })

    if (q) params.append('q', q)
    if (dataAberturaInicio) params.append('dataAberturaInicio', dataAberturaInicio)
    if (dataAberturaFim) params.append('dataAberturaFim', dataAberturaFim)
    if (terminalId) params.append('terminalId', terminalId)
    if (status) params.append('status', status)

    const response = await apiClient.request<any>(
      `/api/v1/caixa/operacao-caixa-terminal?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return NextResponse.json(response.data || {})
  } catch (error) {
    console.error('Erro ao buscar operações de caixa:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar operações de caixa' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

