import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { montarBodyReemitirNotaDelivery } from '@/src/domain/services/pedido/RegrasEmissaoFiscalDelivery'

/**
 * POST /api/delivery/pedidos/[pedidoRef]/reemitir-nota
 * Proxy para POST /api/v1/delivery/pedidos/{id}/reemitir-nota.
 * Body homologação: `{ numero? }` — o id do pedido está na URL.
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

    const body = (await request.json().catch(() => ({}))) as { numero?: unknown }
    if (body.numero != null && body.numero !== '') {
      const numero = Number(body.numero)
      if (!Number.isFinite(numero) || numero < 1) {
        return NextResponse.json(
          { error: 'Número da nota deve ser um inteiro positivo.' },
          { status: 400 }
        )
      }
    }

    const payload = montarBodyReemitirNotaDelivery({
      numero: body.numero == null || body.numero === '' ? undefined : Number(body.numero),
    })

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoRef)}/reemitir-nota`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    return NextResponse.json(response.data ?? {}, { status: response.status || 200 })
  } catch (error) {
    console.error('Erro ao reemitir nota do pedido delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
