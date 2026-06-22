import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/delivery/pedidos/[pedidoRef]
 * Proxy para GET /api/v1/delivery/pedidos/{id} (módulo delivery do backend Jiffy).
 */
export async function GET(
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

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoRef)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    console.error('Erro ao buscar pedido delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/delivery/pedidos/[pedidoRef]
 * Proxy para PATCH /api/v1/delivery/pedidos/{id} (ex.: observacoes do pedido).
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
      `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoRef)}`,
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
    console.error('Erro ao atualizar pedido delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
