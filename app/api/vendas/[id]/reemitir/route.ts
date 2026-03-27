import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

type ApiErrorData = {
  message?: string
  error?: string
  codigo?: string
  codigoErro?: string
  codigoRejeicao?: string
  categoria?: string
}

/** Evita 500 genérico se o body não for JSON válido ou vier vazio. */
async function lerCorpoJsonSeguro(request: NextRequest): Promise<unknown> {
  try {
    const text = await request.text()
    if (!text?.trim()) return {}
    return JSON.parse(text) as unknown
  } catch {
    return {}
  }
}

/**
 * POST /api/vendas/[id]/reemitir
 *
 * Rota **local** do Next (nome curto). O destino na API externa é sempre `.../reemitir-nota` (Swagger).
 * Um `POST .../reemitir 500` no log do Next indica que o **backend externo** devolveu HTTP 500; o corpo JSON
 * (mensagem SEFAZ etc.) ainda é repassado ao browser — não é falha de URL no proxy.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 })
    }

    const body = await lerCorpoJsonSeguro(request)
    const apiClient = new ApiClient()

    const response = await apiClient.request<any>(
      `/api/v1/operacao-pdv/vendas/${id}/reemitir-nota`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data || {}, { status: response.status })
  } catch (error) {
    if (error instanceof ApiError) {
      const errorData =
        error.data && typeof error.data === 'object' && !Array.isArray(error.data)
          ? (error.data as ApiErrorData & Record<string, unknown>)
          : {}

      if (process.env.NODE_ENV === 'development') {
        console.error(
          '[proxy PDV reemitir-nota] status upstream:',
          error.status,
          'mensagem:',
          error.message
        )
      }

      return NextResponse.json(
        {
          ...errorData,
          error:
            error.message ||
            errorData.message ||
            errorData.error ||
            'Erro ao reemitir nota fiscal',
          codigo: errorData.codigo ?? errorData.codigoErro ?? null,
          codigoRejeicao: errorData.codigoRejeicao ?? null,
          categoria: errorData.categoria ?? null,
        },
        { status: error.status }
      )
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[proxy PDV reemitir-nota] erro não-ApiError:', error)
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
