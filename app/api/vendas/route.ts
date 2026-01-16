import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/vendas
 * Lista vendas com paginação e filtros
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
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const limit = searchParams.get('limit') || ''
    const offset = searchParams.get('offset') || ''
    
    // Parâmetros de filtro
    const q = searchParams.get('q') || ''
    const tipoVenda = searchParams.get('tipoVenda') || ''
    const abertoPorId = searchParams.get('abertoPorId') || ''
    const canceladoPorId = searchParams.get('canceladoPorId') || ''
    const valorFinalMinimo = searchParams.get('valorFinalMinimo') || ''
    const valorFinalMaximo = searchParams.get('valorFinalMaximo') || ''
    const meioPagamentoId = searchParams.get('meioPagamentoId') || ''
    const terminalId = searchParams.get('terminalId') || ''
    const periodoInicial = searchParams.get('periodoInicial') || ''
    const periodoFinal = searchParams.get('periodoFinal') || ''
    
    // Status pode ter múltiplos valores
    const statusParams = searchParams.getAll('status')

    const apiClient = new ApiClient()
    const params = new URLSearchParams()

    // Adiciona limit e offset apenas se forem fornecidos na URL da requisição
    if (limit) params.append('limit', limit)
    if (offset) params.append('offset', offset)

    if (q) params.append('q', q)
    if (tipoVenda) params.append('tipoVenda', tipoVenda)
    if (abertoPorId) params.append('abertoPorId', abertoPorId)
    if (canceladoPorId) params.append('canceladoPorId', canceladoPorId)
    if (valorFinalMinimo) params.append('valorFinalMinimo', valorFinalMinimo)
    if (valorFinalMaximo) params.append('valorFinalMaximo', valorFinalMaximo)
    if (meioPagamentoId) params.append('meioPagamentoId', meioPagamentoId)
    if (terminalId) params.append('terminalId', terminalId)
    if (periodoInicial) params.append('periodoInicial', periodoInicial)
    if (periodoFinal) params.append('periodoFinal', periodoFinal)
    
    // Adiciona múltiplos valores de status
    statusParams.forEach((status) => {
      params.append('status', status)
    })

    const response = await apiClient.request<any>(
      `/api/v1/operacao-pdv/vendas?${params.toString()}`,
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
    console.error('Erro ao buscar vendas:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar vendas' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

