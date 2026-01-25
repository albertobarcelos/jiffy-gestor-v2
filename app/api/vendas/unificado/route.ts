import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/vendas/unificado
 * Lista vendas unificadas (PDV + Gestor) com paginação e filtros
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    
    const params = new URLSearchParams()
    params.append('empresaId', tokenInfo.empresaId)
    
    const origem = searchParams.get('origem')
    const statusFiscal = searchParams.get('statusFiscal')
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    
    if (origem) params.append('origem', origem)
    if (statusFiscal) params.append('statusFiscal', statusFiscal)
    if (mes) params.append('mes', mes)
    if (ano) params.append('ano', ano)
    if (page) params.append('page', page)
    if (limit) params.append('limit', limit)

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/operacao-pdv/vendas/unificado?${params.toString()}`,
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
    console.error('Erro ao buscar vendas unificadas:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar vendas unificadas' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
