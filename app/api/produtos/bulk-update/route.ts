import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

/**
 * POST /api/produtos/bulk-update
 * Atualiza múltiplos produtos em lote
 * 
 * Body esperado:
 * Array<{
 *   produtoId: string;
 *   valor?: number;
 *   impressorasIds?: string[];
 *   impressorasIdsToRemove?: string[];
 *   gruposComplementosIds?: string[];
 *   gruposComplementosIdsToRemove?: string[];
 * }>
 */
export async function POST(req: NextRequest) {
  try {
    // Valida token e extrai informações
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    // Valida que empresaId está presente (requisito para multi-tenancy)
    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const body = await req.json()

    // Valida que body é um array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { message: 'Body deve ser um array de atualizações' },
        { status: 400 }
      )
    }

    // Valida que array não está vazio
    if (body.length === 0) {
      return NextResponse.json(
        { message: 'Array não pode estar vazio' },
        { status: 400 }
      )
    }

    // Valida cada item do array
    for (let i = 0; i < body.length; i++) {
      const item = body[i]

      // Valida que tem produtoId
      if (!item.produtoId || typeof item.produtoId !== 'string') {
        return NextResponse.json(
          { message: `Item ${i + 1}: produtoId é obrigatório e deve ser uma string` },
          { status: 400 }
        )
      }

      // Valida que tem pelo menos um campo de atualização
      const hasUpdate =
        item.valor !== undefined ||
        item.impressorasIds !== undefined ||
        item.impressorasIdsToRemove !== undefined ||
        item.gruposComplementosIds !== undefined ||
        item.gruposComplementosIdsToRemove !== undefined

      if (!hasUpdate) {
        return NextResponse.json(
          { message: `Item ${i + 1}: deve ter pelo menos um campo de atualização` },
          { status: 400 }
        )
      }

      // Valida tipos dos campos opcionais
      if (item.valor !== undefined && typeof item.valor !== 'number') {
        return NextResponse.json(
          { message: `Item ${i + 1}: valor deve ser um número` },
          { status: 400 }
        )
      }

      if (item.impressorasIds !== undefined && !Array.isArray(item.impressorasIds)) {
        return NextResponse.json(
          { message: `Item ${i + 1}: impressorasIds deve ser um array` },
          { status: 400 }
        )
      }

      if (item.impressorasIdsToRemove !== undefined && !Array.isArray(item.impressorasIdsToRemove)) {
        return NextResponse.json(
          { message: `Item ${i + 1}: impressorasIdsToRemove deve ser um array` },
          { status: 400 }
        )
      }

      if (item.gruposComplementosIds !== undefined && !Array.isArray(item.gruposComplementosIds)) {
        return NextResponse.json(
          { message: `Item ${i + 1}: gruposComplementosIds deve ser um array` },
          { status: 400 }
        )
      }

      if (item.gruposComplementosIdsToRemove !== undefined && !Array.isArray(item.gruposComplementosIdsToRemove)) {
        return NextResponse.json(
          { message: `Item ${i + 1}: gruposComplementosIdsToRemove deve ser um array` },
          { status: 400 }
        )
      }
    }

    // Chama API externa
    const apiClient = new ApiClient()
    const { data } = await apiClient.request('/api/v1/cardapio/produtos/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    // Retorna resposta
    return NextResponse.json({
      success: true,
      totalUpdated: data.totalUpdated || body.length,
      produtosIds: data.produtosIds || body.map((item: any) => item.produtoId),
    })
  } catch (error: any) {
    console.error('Erro na API de bulk-update de produtos:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}
