import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

interface ProdutosResponse {
  items?: unknown[]
  count?: number
  [key: string]: unknown
}

/**
 * GET - Lista produtos vinculados a um grupo
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = validateRequest(req)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { tokenInfo } = validation
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '10', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  if (!id) {
    return NextResponse.json(
      { message: 'Grupo inválido' },
      { status: 400 }
    )
  }

  try {
    const apiClient = new ApiClient()
    const query = new URLSearchParams({
      grupoProdutoId: id,
      limit: String(limit),
      offset: String(offset),
    })

    const response = await apiClient.request<ProdutosResponse>(
      `/api/v1/cardapio/produtos?${query.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    const data = (response.data ?? {}) as ProdutosResponse
    const items = Array.isArray(data.items) ? data.items : []
    const count = typeof data.count === 'number' ? data.count : items.length
    const nextOffset = items.length === limit ? offset + limit : null

    return NextResponse.json(
      {
        success: true,
        items,
        count,
        hasMore: items.length === limit,
        nextOffset,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    console.error('Erro ao listar produtos do grupo:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao buscar produtos do grupo' },
      { status: error.status || 500 }
    )
  }
}

