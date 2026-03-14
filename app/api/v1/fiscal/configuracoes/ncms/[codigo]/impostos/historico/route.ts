import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/v1/fiscal/configuracoes/ncms/[codigo]/impostos/historico
 * Lista histórico de alterações de configuração de impostos por NCM
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { tokenInfo } = validation
    const { codigo } = await params

    if (!codigo) {
      return NextResponse.json({ error: 'Código NCM é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any[]>(
      `/api/v1/fiscal/configuracoes/ncms/${codigo}/impostos/historico`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(response.data || [])
  } catch (error) {
    console.error('Erro ao buscar histórico de configuração:', error)
    
    // Se for timeout, retorna array vazio ao invés de erro para não quebrar a UI
    if (error instanceof ApiError) {
      if (error.status === 504 && error.data && typeof error.data === 'object' && 'timeout' in error.data) {
        console.warn('Timeout ao buscar histórico de configuração - retornando array vazio')
        return NextResponse.json([], { status: 200 })
      }
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar histórico' },
        { status: error.status }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
