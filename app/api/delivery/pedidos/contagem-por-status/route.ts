import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  extrairPedidosDeliveryQueryParamsDeSearchParams,
  serializarPedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListQuery'
import {
  PEDIDOS_DELIVERY_CONTAGEM_POR_STATUS_VAZIA,
  type PedidosDeliveryContagemPorStatusResponse,
} from '@/src/application/dto/api/pedidoDeliveryListApi'

/**
 * GET /api/delivery/pedidos/contagem-por-status
 * Proxy para GET /api/v1/delivery/pedidos/contagem-por-status.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { searchParams } = new URL(request.url)
    const queryParams = extrairPedidosDeliveryQueryParamsDeSearchParams(searchParams)

    if (queryParams.cancelado == null) queryParams.cancelado = false

    const { offset: _o, limit: _l, statusDelivery: _s, ...contagemParams } = queryParams
    const query = serializarPedidosDeliveryQueryParams(contagemParams).toString()

    const apiClient = new ApiClient()
    const response = await apiClient.request<PedidosDeliveryContagemPorStatusResponse>(
      `/api/v1/delivery/pedidos/contagem-por-status${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    return NextResponse.json(response.data ?? PEDIDOS_DELIVERY_CONTAGEM_POR_STATUS_VAZIA)
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('Erro na contagem de pedidos delivery por status:', {
        status: error.status,
        message: error.message,
        details: error.data,
      })
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    console.error('Erro na contagem de pedidos delivery por status:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
