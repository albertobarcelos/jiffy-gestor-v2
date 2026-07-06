import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import {
  erroImpressao as erroImpressaoBff,
  logImpressao as logImpressaoBff,
} from '@/src/shared/utils/logImpressaoDelivery'

/**
 * GET /api/delivery/pedidos/[pedidoRef]/instrucoes-impressao
 * Proxy para GET /api/v1/delivery/pedidos/{id}/instrucoes-impressao.
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
    const estacaoImpressaoId = searchParams.get('estacaoImpressaoId')?.trim()
    if (!estacaoImpressaoId) {
      return NextResponse.json(
        { error: 'estacaoImpressaoId é obrigatório para gerar instruções de impressão.' },
        { status: 400 }
      )
    }

    const query = new URLSearchParams({ estacaoImpressaoId }).toString()

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/pedidos/${encodeURIComponent(pedidoRef)}/instrucoes-impressao?${query}`,
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
    const qMapeamentos =
      parsed && Array.isArray(parsed.mapeamentos) ? parsed.mapeamentos.length : undefined

    logImpressaoBff('bff.delivery.pedidos.instrucoes_impressao.resposta', {
      pedidoId: pedidoRef,
      statusHttp: response.status,
      qMapeamentos,
      temWarnings: Boolean(
        parsed && Array.isArray(parsed.warnings) && parsed.warnings.length > 0
      ),
      estacaoQuery: estacaoImpressaoId.slice(0, 8),
    })

    return NextResponse.json(response.data ?? { mapeamentos: [], warnings: [] })
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      logImpressaoBff('bff.delivery.pedidos.instrucoes_impressao.nao_encontrado', {
        pedidoId: pedidoRef,
      })
      return NextResponse.json(
        { error: error.message || 'Instruções de impressão não disponíveis para este pedido' },
        { status: 404 }
      )
    }
    erroImpressaoBff('bff.delivery.pedidos.instrucoes_impressao.erro', {
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
