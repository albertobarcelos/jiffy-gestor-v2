import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  extrairPedidosDeliveryQueryParamsDeSearchParams,
  serializarPedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListQuery'
import { PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { PedidosDeliveryListResponse } from '@/src/application/dto/api/pedidoDeliveryListApi'

const RESPOSTA_VAZIA_JIFFY: PedidosDeliveryListResponse = {
  count: 0,
  page: 1,
  limit: PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  items: [],
}

/**
 * POST /api/delivery/pedidos
 * Cria pedido no módulo delivery Jiffy (`POST /api/v1/delivery/pedidos`).
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>('/api/v1/delivery/pedidos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data ?? {}, { status: response.status || 201 })
  } catch (error) {
    console.error('Erro ao criar pedido delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * GET /api/delivery/pedidos
 * Proxy autenticado de `GET /api/v1/delivery/pedidos` (etapas canônicas).
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { searchParams } = new URL(request.url)
    const queryParams = extrairPedidosDeliveryQueryParamsDeSearchParams(searchParams)

    if (queryParams.offset == null) queryParams.offset = 0
    if (queryParams.limit == null) queryParams.limit = PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE
    const statusDelivery = queryParams.statusDelivery
    const statusLista = Array.isArray(statusDelivery)
      ? statusDelivery
      : statusDelivery
        ? [statusDelivery]
        : []
    const incluiCancelado = statusLista.includes('CANCELADO')
    if (queryParams.cancelado == null && !incluiCancelado) {
      queryParams.cancelado = false
    }

    const query = serializarPedidosDeliveryQueryParams(queryParams).toString()

    const apiClient = new ApiClient()
    const response = await apiClient.request<PedidosDeliveryListResponse>(
      `/api/v1/delivery/pedidos${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    return NextResponse.json(response.data ?? RESPOSTA_VAZIA_JIFFY)
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Erro ao listar pedidos delivery:', {
        status: error.status,
        message: error.message,
        details: error.data,
      })
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    console.error('Erro ao listar pedidos delivery:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar pedidos' },
      { status: 500 }
    )
  }
}
