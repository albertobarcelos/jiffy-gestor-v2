import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * Interface de resposta da validação de compatibilidade CEST x NCM.
 */
interface ValidarCestNcmResponse {
  cestCodigo: string
  ncmCodigo: string
  compativel: boolean
  descricaoCest?: string
  mensagem: string
}

/**
 * Rota proxy para validação de compatibilidade CEST x NCM.
 * Repassa a requisição ao backend, que por sua vez consulta o microsserviço fiscal.
 * Frontend → Next.js API Route → Backend → Microsserviço Fiscal
 *
 * Valida formato dos parâmetros antes de repassar (fail-fast).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ codigo: string; ncmCodigo: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { codigo, ncmCodigo } = await params

    // Validação de formato (fail-fast antes de chamar o backend)
    if (!/^\d{7}$/.test(codigo)) {
      return NextResponse.json(
        {
          cestCodigo: codigo,
          ncmCodigo,
          compativel: false,
          mensagem: 'CEST inválido: deve conter exatamente 7 dígitos numéricos',
        },
        { status: 400 }
      )
    }
    if (!/^\d{8}$/.test(ncmCodigo)) {
      return NextResponse.json(
        {
          cestCodigo: codigo,
          ncmCodigo,
          compativel: false,
          mensagem: 'NCM inválido: deve conter exatamente 8 dígitos numéricos',
        },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<ValidarCestNcmResponse>(
      `/api/v1/fiscal/configuracoes/cests/validar/${codigo}/ncm/${ncmCodigo}`,
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
        { error: error.message || 'Erro ao validar compatibilidade CEST x NCM' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
