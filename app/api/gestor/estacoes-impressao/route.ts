import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import type { EstacaoImpressaoResumo } from '@/src/infrastructure/api/estacoesImpressaoApi'

/** Corpo típico: `{ id, nome, ativo }` ou `{ data: { … } }` (OpenAPI/variações do gateway). */
function extrairObjetoPayload(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>
  }
  return o
}

function normalizarEstacaoResumo(payload: unknown): EstacaoImpressaoResumo | null {
  const o = extrairObjetoPayload(payload)
  if (!o) return null
  const id = o.id != null ? String(o.id).trim() : ''
  if (!id) return null
  const nome = o.nome != null ? String(o.nome) : ''
  const ativo = typeof o.ativo === 'boolean' ? o.ativo : true
  return { id, nome, ativo }
}

function normalizarListaEstacoes(payload: unknown): EstacaoImpressaoResumo[] {
  let rows: unknown[] | null = null
  if (Array.isArray(payload)) rows = payload
  else if (payload && typeof payload === 'object') {
    const o = payload as Record<string, unknown>
    const inner = o.items ?? o.data ?? o.results
    if (Array.isArray(inner)) rows = inner
  }
  if (!rows) return []
  return rows
    .map(r => normalizarEstacaoResumo(r))
    .filter((item): item is EstacaoImpressaoResumo => item !== null)
}

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

    const normalized = normalizarEstacaoResumo(response.data)
    if (!normalized) {
      console.error(
        '[estacoes-impressao] POST upstream sem objeto com id:',
        JSON.stringify(response.data)
      )
      return NextResponse.json(
        {
          error:
            'A API criou a estação, mas a resposta não trouxe um id utilizável (esperado: { id, nome, ativo } ou { data: { id, nome, ativo } }). Verifique contrato/OpenAPI ou versão do backend.',
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

    return NextResponse.json(normalizarListaEstacoes(response.data))
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
