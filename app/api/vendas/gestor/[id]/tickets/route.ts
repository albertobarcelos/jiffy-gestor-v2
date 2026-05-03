import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { logImpressao as logImpressaoBff, erroImpressao as erroImpressaoBff } from '@/src/shared/utils/logImpressaoDelivery'

/**
 * GET /api/vendas/gestor/[id]/tickets
 * Repassa para GET /api/v1/gestor/vendas/{id}/tickets — tickets agrupados para impressão delivery.
 */
export async function GET(
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

    const apiClient = new ApiClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const response = await apiClient.request<unknown>(
      `/api/v1/gestor/vendas/${id}/tickets${query ? `?${query}` : ''}`,
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
    logImpressaoBff('bff.gestor.vendas.tickets.resposta', {
      vendaId: id,
      statusHttp: response.status,
      qTickets,
      temWarnings: Boolean(parsed && Array.isArray(parsed.warnings) && parsed.warnings.length > 0),
      estacaoQuery: searchParams.get('estacaoImpressaoId')?.slice(0, 8),
    })

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    erroImpressaoBff('bff.gestor.vendas.tickets.erro', {
      mensagem: error instanceof Error ? error.message : String(error),
    })
    console.error('Erro ao buscar tickets da venda gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar tickets' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
