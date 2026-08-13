import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

function parseOptionalBool(value: string | null): boolean | null {
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

/** GET /api/menus/:id/produtos — snapshots MenuProduto */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const { searchParams } = new URL(req.url)

    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const result = await repo.listarProdutos(id, {
      q: searchParams.get('q') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      ativo: parseOptionalBool(searchParams.get('ativo')),
      favorito: parseOptionalBool(searchParams.get('favorito')),
      grupoProdutoId: searchParams.get('grupoProdutoId') || undefined,
      grupoComplementosId: searchParams.get('grupoComplementosId') || undefined,
    })

    return NextResponse.json(
      { success: true, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao listar produtos do menu')
  }
}

/** PATCH /api/menus/:id/produtos — add / remove / update em lote */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const menu = await repo.atualizarProdutos(id, {
      add: body.add,
      remove: body.remove,
      update: body.update,
    })

    return NextResponse.json({ success: true, data: menu })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar produtos do menu')
  }
}
