import { NextRequest, NextResponse } from 'next/server'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

interface FiscalLoteResponse {
  total?: number
  criados?: number
  atualizados?: number
  erros?: number
  produtos?: Array<{ produtoId: string }>
  errosDetalhe?: Array<{ produtoId: string; mensagem: string; campo?: string }>
}

/**
 * PATCH /api/produtos/fiscal/lote
 * Proxy para PATCH /api/v1/cardapio/produtos/fiscal/lote
 *
 * Body:
 * {
 *   produtoIds: string[];
 *   alteracoes: {
 *     ncm?: string | null;
 *     cest?: string | null;
 *     origemMercadoria?: number | null;
 *     tipoProduto?: string | null;
 *     indicadorProducaoEscala?: string | null;
 *   }
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const body = await req.json()

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ message: 'Body deve ser um objeto' }, { status: 400 })
    }

    if (!Array.isArray(body.produtoIds) || body.produtoIds.length === 0) {
      return NextResponse.json(
        { message: 'produtoIds é obrigatório e deve ser um array não vazio' },
        { status: 400 }
      )
    }

    for (let i = 0; i < body.produtoIds.length; i++) {
      if (typeof body.produtoIds[i] !== 'string' || body.produtoIds[i].trim() === '') {
        return NextResponse.json(
          { message: `produtoIds[${i}] deve ser uma string não vazia` },
          { status: 400 }
        )
      }
    }

    if (
      !body.alteracoes ||
      typeof body.alteracoes !== 'object' ||
      Array.isArray(body.alteracoes)
    ) {
      return NextResponse.json(
        { message: 'alteracoes é obrigatório e deve ser um objeto' },
        { status: 400 }
      )
    }

    const alteracoes = body.alteracoes as Record<string, unknown>
    const hasAlteracao =
      alteracoes.ncm !== undefined ||
      alteracoes.cest !== undefined ||
      alteracoes.origemMercadoria !== undefined ||
      alteracoes.tipoProduto !== undefined ||
      alteracoes.indicadorProducaoEscala !== undefined

    if (!hasAlteracao) {
      return NextResponse.json(
        { message: 'Informe ao menos um campo em alteracoes' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const { data, status } = await apiClient.request<FiscalLoteResponse>(
      '/api/v1/cardapio/produtos/fiscal/lote',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: JSON.stringify({
          produtoIds: body.produtoIds,
          alteracoes: body.alteracoes,
        }),
      }
    )

    return NextResponse.json(data, { status })
  } catch (error: unknown) {
    console.error('Erro na API de fiscal em lote de produtos:', error)

    if (error instanceof ApiError) {
      const data = error.data
      if (
        data &&
        typeof data === 'object' &&
        !Array.isArray(data) &&
        'errosDetalhe' in data
      ) {
        return NextResponse.json(data, { status: error.status })
      }

      return NextResponse.json(
        { message: error.message || 'Erro ao atualizar dados fiscais em lote' },
        { status: error.status || 500 }
      )
    }

    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 })
  }
}
