import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * PATCH /api/v1/fiscal/produtos-fiscais/lote
 * Atualiza informações fiscais de múltiplos produtos em uma única chamada.
 * Frontend → Next BFF → jiffy-backend → FiscalGateway → FiscalService
 * (o gateway sincroniza o NCM denormalizado na tabela de produtos do cardápio).
 *
 * Body: { produtoIds: string[], alteracoes: { ncm?, cest?, origemMercadoria?, tipoProduto?, indicadorProducaoEscala? } }
 */
export async function PATCH(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    if (!body || !Array.isArray(body.produtoIds)) {
      return NextResponse.json(
        { message: 'Body deve conter produtoIds (array)' },
        { status: 400 }
      )
    }
    if (!body.alteracoes || typeof body.alteracoes !== 'object' || Array.isArray(body.alteracoes)) {
      return NextResponse.json(
        { message: 'Body deve conter alteracoes (objeto)' },
        { status: 400 }
      )
    }
    if (body.produtoIds.length === 0) {
      return NextResponse.json(
        { message: 'produtoIds não pode ser vazio' },
        { status: 400 }
      )
    }
    if (body.produtoIds.length > 500) {
      return NextResponse.json(
        { message: 'Máximo de 500 produtos por lote' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<{
      total?: number
      criados?: number
      atualizados?: number
      erros?: number
      produtos?: unknown[]
      errosDetalhe?: unknown[]
    }>('/api/v1/fiscal/produtos-fiscais/lote', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify({
        produtoIds: body.produtoIds,
        alteracoes: body.alteracoes,
      }),
    })

    const data = response.data ?? {}
    return NextResponse.json({
      total: data.total ?? body.produtoIds.length,
      criados: data.criados ?? 0,
      atualizados: data.atualizados ?? 0,
      erros: data.erros ?? 0,
      produtos: Array.isArray(data.produtos) ? data.produtos : [],
      errosDetalhe: Array.isArray(data.errosDetalhe) ? data.errosDetalhe : [],
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message || 'Erro ao atualizar produtos fiscais em lote' },
        { status: error.status }
      )
    }
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
