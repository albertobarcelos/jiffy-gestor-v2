import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/produtos/bulk-update
 * Atualiza múltiplos produtos em lote
 * 
 * Request Body:
 * Array<{
 *   produtoId: string;
 *   valor?: number;                              // Opcional - preço do produto
 *   impressorasIds?: string[];                   // Opcional - array de IDs das impressoras para adicionar
 *   impressorasIdsToRemove?: string[];           // Opcional - array de IDs das impressoras para remover
 *   gruposComplementosIds?: string[];            // Opcional - array de IDs dos grupos de complementos para adicionar
 *   gruposComplementosIdsToRemove?: string[];    // Opcional - array de IDs dos grupos de complementos para remover
 * }>
 * 
 * Response:
 * {
 *   totalUpdated: number;    // Número de produtos únicos atualizados
 *   produtosIds: string[];    // Array de IDs dos produtos atualizados
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error || NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }

    const body = await req.json()

    // Validação: body deve ser um array
    if (!Array.isArray(body)) {
      return NextResponse.json(
        { message: 'Body deve ser um array de objetos' },
        { status: 400 }
      )
    }

    // Validação: cada item deve ter produtoId e pelo menos um campo (valor, impressorasIds ou impressorasIdsToRemove)
    for (const item of body) {
      if (!item.produtoId) {
        return NextResponse.json(
          { message: 'Cada item deve ter um produtoId' },
          { status: 400 }
        )
      }

      const hasValor = 'valor' in item
      const hasImpressorasIds = 'impressorasIds' in item
      const hasImpressorasIdsToRemove = 'impressorasIdsToRemove' in item
      const hasGruposComplementosIds = 'gruposComplementosIds' in item
      const hasGruposComplementosIdsToRemove = 'gruposComplementosIdsToRemove' in item

      if (!hasValor && !hasImpressorasIds && !hasImpressorasIdsToRemove && !hasGruposComplementosIds && !hasGruposComplementosIdsToRemove) {
        return NextResponse.json(
          { message: 'Cada item deve ter pelo menos um campo: valor, impressorasIds, impressorasIdsToRemove, gruposComplementosIds ou gruposComplementosIdsToRemove' },
          { status: 400 }
        )
      }

      // Validação: impressorasIds deve ser array de strings
      if (hasImpressorasIds && !Array.isArray(item.impressorasIds)) {
        return NextResponse.json(
          { message: 'impressorasIds deve ser um array de strings' },
          { status: 400 }
        )
      }

      // Validação: impressorasIdsToRemove deve ser array de strings
      if (hasImpressorasIdsToRemove && !Array.isArray(item.impressorasIdsToRemove)) {
        return NextResponse.json(
          { message: 'impressorasIdsToRemove deve ser um array de strings' },
          { status: 400 }
        )
      }

      // Validação: gruposComplementosIds deve ser array de strings
      if (hasGruposComplementosIds && !Array.isArray(item.gruposComplementosIds)) {
        return NextResponse.json(
          { message: 'gruposComplementosIds deve ser um array de strings' },
          { status: 400 }
        )
      }

      // Validação: gruposComplementosIdsToRemove deve ser array de strings
      if (hasGruposComplementosIdsToRemove && !Array.isArray(item.gruposComplementosIdsToRemove)) {
        return NextResponse.json(
          { message: 'gruposComplementosIdsToRemove deve ser um array de strings' },
          { status: 400 }
        )
      }
    }

    const apiClient = new ApiClient()
    
    // Chama a API externa
    const { data } = await apiClient.request<{
      totalUpdated?: number
      produtosIds?: string[]
    }>('/api/v1/cardapio/produtos/bulk-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validation.tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json({
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
