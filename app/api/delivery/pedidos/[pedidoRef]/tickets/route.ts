import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { logImpressao as logImpressaoBff, erroImpressao as erroImpressaoBff } from '@/src/shared/utils/logImpressaoDelivery'

/**
 * GET /api/delivery/pedidos/[pedidoRef]/tickets
 * Proxy para GET /api/v1/delivery/pedidos/{id}/tickets — comandas agrupadas para impressão.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pedidoRef: string }> }
) {
  const { pedidoRef } = await params

  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    if (!pedidoRef?.trim()) {
      return NextResponse.json({ error: 'ID do pedido é obrigatório' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoRef)}/tickets${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    const body = response.data
    const parsed = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
    const qTickets = parsed && Array.isArray(parsed.tickets) ? parsed.tickets.length : undefined
    logImpressaoBff('bff.delivery.pedidos.tickets.resposta', {
      pedidoId: pedidoRef,
      statusHttp: response.status,
      qTickets,
      temWarnings: Boolean(parsed && Array.isArray(parsed.warnings) && parsed.warnings.length > 0),
      estacaoQuery: searchParams.get('estacaoImpressaoId')?.slice(0, 8),
    })

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      logImpressaoBff('bff.delivery.pedidos.tickets.nao_encontrado', { pedidoId: pedidoRef })
      return NextResponse.json(
        { error: error.message || 'Tickets não disponíveis para este pedido' },
        { status: 404 }
      )
    }
    erroImpressaoBff('bff.delivery.pedidos.tickets.erro', {
      pedidoId: pedidoRef,
      mensagem: error instanceof Error ? error.message : String(error),
    })
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
