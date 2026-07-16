import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

type RouteContext = { params: Promise<{ documentId: string }> }

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * GET /api/v1/fiscal/documentos/[documentId]
 * Proxy para metadados do documento (inclui xmlEnvio, xmlRetorno, xmlAutorizado).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { documentId } = await context.params

    if (!documentId?.trim()) {
      return NextResponse.json(
        { error: 'ID do documento fiscal é obrigatório' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(documentId)) {
      return NextResponse.json(
        { error: 'ID do documento fiscal inválido (deve ser um UUID)' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      `/api/v1/fiscal/documentos/${encodeURIComponent(documentId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('[Documento Fiscal] Erro ao buscar documento:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar documento fiscal' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
