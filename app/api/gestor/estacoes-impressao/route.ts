import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  normalizarEstacaoImpressaoResumo,
  normalizarListaEstacoesImpressao,
} from '@/src/infrastructure/api/normalizarEstacaoImpressaoResumo'

export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/gestor/estacoes-impressao', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    const normalized = normalizarEstacaoImpressaoResumo(response.data)
    if (!normalized) {
      console.error(
        '[estacoes-impressao] POST upstream sem objeto com id:',
        JSON.stringify(response.data)
      )
      return NextResponse.json(
        {
          error:
            'A API criou a estação, mas a resposta não trouxe um id utilizável (esperado: { id, nome, ativo, gestorDelivery } ou { data: { … } }). Verifique contrato/OpenAPI ou versão do backend.',
        },
        { status: 502 }
      )
    }
    return NextResponse.json(normalized, { status: response.status || 201 })
  } catch (error) {
    console.error('Erro ao criar estação de impressão:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/gestor/estacoes-impressao', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        Accept: 'application/json',
      },
    })

    return NextResponse.json(normalizarListaEstacoesImpressao(response.data))
  } catch (error) {
    console.error('Erro ao listar estações de impressão:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
