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

/**
 * POST /api/vendas
 * Cria uma nova venda
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    
    // Log para debug
    console.log('📤 Criando venda - Token Info:', {
      userId: tokenInfo.userId,
      empresaId: tokenInfo.empresaId,
    })
    console.log('📤 Body recebido:', JSON.stringify(body, null, 2))

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/operacao-pdv/vendas`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data || {}, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar venda:', error)
    if (error instanceof ApiError) {
      console.error('Detalhes do ApiError:', {
        message: error.message,
        status: error.status,
        data: error.data,
      })
      return NextResponse.json(
        { error: error.message || 'Erro ao criar venda', details: error.data },
        { status: error.status }
      )
    }
    // Log detalhado para erros não-ApiError
    console.error('Erro não-ApiError:', {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor', details: String(error) },
      { status: 500 }
    )
  }
}

