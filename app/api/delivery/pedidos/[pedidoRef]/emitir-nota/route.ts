import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/delivery/pedidos/[pedidoRef]/emitir-nota
 * Proxy para POST /api/v1/delivery/pedidos/{id}/emitir-nota (módulo delivery).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pedidoRef: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { pedidoRef } = await params
    if (!pedidoRef?.trim()) {
      return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 })
    }

    const body = (await request.json()) as { modelo?: number }
    const modelo = Number(body.modelo)
    if (![55, 65].includes(modelo)) {
      return NextResponse.json(
        { error: 'Modelo deve ser 55 (NF-e) ou 65 (NFC-e)' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoRef)}/emitir-nota`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ modelo }),
      }
    )

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    console.error('Erro ao emitir nota do pedido delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
