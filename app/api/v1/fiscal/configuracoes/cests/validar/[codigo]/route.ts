import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Interface de resposta da validação de CEST.
 */
interface ValidarCestResponse {
  codigo: string
  valido: boolean
  descricao?: string
  segmento?: string
  mensagem: string
}

/**
 * Rota proxy para validação de CEST.
 * Repassa a requisição ao backend, que por sua vez consulta o microsserviço fiscal.
 * Frontend → Next.js API Route → Backend → Microsserviço Fiscal
 *
 * Valida formato do CEST antes de repassar (fail-fast).
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

    // Validação de formato (fail-fast antes de chamar o backend)
    if (!/^\d{7}$/.test(codigo)) {
      return NextResponse.json(
        {
          codigo,
          valido: false,
          mensagem: 'CEST inválido: deve conter exatamente 7 dígitos numéricos',
        },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<ValidarCestResponse>(
      `/api/v1/fiscal/configuracoes/cests/validar/${codigo}`,
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
        { error: error.message || 'Erro ao validar CEST' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
