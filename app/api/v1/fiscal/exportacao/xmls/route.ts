import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { ExportacaoXmlSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'

/**
 * POST /api/v1/fiscal/exportacao/xmls
 * Inicia exportação assíncrona (202 + exportacaoId).
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    const parsed = ExportacaoXmlSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      '/api/v1/fiscal/exportacao/xmls',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: JSON.stringify(parsed.data),
      }
    )

    return NextResponse.json(response.data, { status: response.status || 202 })
  } catch (error) {
    console.error('[Exportacao XML] Erro ao iniciar:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao iniciar exportação de XMLs' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      {
        error: 'Erro interno do servidor ao iniciar exportação de XMLs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
