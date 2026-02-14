import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Rota proxy para validação de NCM.
 * Repassa a requisição ao backend, que por sua vez consulta o microsserviço fiscal.
 * Frontend → Next.js API Route → Backend → Microsserviço Fiscal
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

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/fiscal/configuracoes/ncms/validar/${codigo}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao validar NCM' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
