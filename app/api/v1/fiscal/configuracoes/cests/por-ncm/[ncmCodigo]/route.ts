import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Interface de resposta para CESTs compatíveis com um NCM.
 */
interface CestPorNcmResponse {
  codigo: string
  descricao: string
  segmento: string
  numeroAnexo?: string
}

/**
 * Rota proxy para buscar CESTs compatíveis com um NCM.
 * Repassa a requisição ao backend, que por sua vez consulta o microsserviço fiscal.
 * Frontend → Next.js API Route → Backend → Microsserviço Fiscal
 *
 * Valida formato do NCM antes de repassar (fail-fast).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ncmCodigo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { ncmCodigo } = await params

    // Validação de formato (fail-fast antes de chamar o backend)
    if (!/^\d{8}$/.test(ncmCodigo)) {
      return NextResponse.json(
        { error: 'NCM inválido: deve conter exatamente 8 dígitos numéricos' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<CestPorNcmResponse[]>(
      `/api/v1/fiscal/configuracoes/cests/por-ncm/${ncmCodigo}`,
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
        { error: error.message || 'Erro ao buscar CESTs por NCM' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
