import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * PATCH /api/delivery/pedidos/[pedidoRef]/transicao-status
 * Proxy para PATCH /api/v1/delivery/pedidos/{id}/transicao-status.
 */
export async function PATCH(
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

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoRef)}/transicao-status`,
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

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    console.error('Erro na transição de status delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
