import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { normalizarEstacaoImpressaoResumo } from '@/src/infrastructure/api/normalizarEstacaoImpressaoResumo'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID da estação é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/gestor/estacoes-impressao/${encodeURIComponent(id.trim())}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const normalized = normalizarEstacaoImpressaoResumo(response.data)
    if (!normalized) {
      console.error(
        '[estacoes-impressao] PATCH upstream sem objeto com id:',
        JSON.stringify(response.data)
      )
      return NextResponse.json(
        {
          error:
            'A API atualizou a estação, mas a resposta não trouxe um id utilizável (esperado: { id, nome, ativo, gestorDelivery }).',
        },
        { status: 502 }
      )
    }
    return NextResponse.json(normalized, { status: response.status || 200 })
  } catch (error) {
    console.error('Erro ao atualizar estação de impressão:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
