import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'

type RouteContext = { params: Promise<{ exportacaoId: string }> }

/**
 * GET /api/v1/fiscal/exportacao/xmls/[exportacaoId]/download
 * Proxy do redirect S3 (ou JSON com URL) do microserviço fiscal.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { exportacaoId } = await context.params

    if (!exportacaoId) {
      return NextResponse.json({ error: 'exportacaoId é obrigatório' }, { status: 400 })
    }

    const backendUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || 'http://localhost:3000'
    const url = `${backendUrl}/api/v1/fiscal/exportacao/xmls/${encodeURIComponent(exportacaoId)}/download`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        Accept: 'application/json, */*',
      },
      redirect: 'manual',
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location') || response.headers.get('location')
      if (location) {
        return NextResponse.json({ url: location })
      }
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (!response.ok) {
      if (response.status === 410) {
        return NextResponse.json(
          { error: 'Link expirado. Exporte novamente.' },
          { status: 410 }
        )
      }
      if (contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({}))
        return NextResponse.json(
          {
            error:
              (errorData as { message?: string; error?: string }).message ||
              (errorData as { error?: string }).error ||
              'Erro ao obter download',
          },
          { status: response.status }
        )
      }
      return NextResponse.json(
        { error: `Erro ${response.status}: ${response.statusText}` },
        { status: response.status }
      )
    }

    if (contentType.includes('application/json')) {
      const data = await response.json()
      if (data && typeof data === 'object' && 'url' in data) {
        return NextResponse.json(data)
      }
      return NextResponse.json(data)
    }

    return NextResponse.json(
      { error: 'Resposta de download inesperada' },
      { status: 502 }
    )
  } catch (error) {
    console.error('[Exportacao XML] Erro no download:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao obter download' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
