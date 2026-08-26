import { NextRequest, NextResponse } from 'next/server'
import {
  AtualizarMenuProdutosBatchUseCase,
  ListarMenuProdutosUseCase,
} from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
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
    const tipoRaw = searchParams.get('tipo')
    const tipo =
      tipoRaw === 'all' || tipoRaw === 'padrao' || tipoRaw === 'pizza' ? tipoRaw : undefined

    const useCase = new ListarMenuProdutosUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const result = await useCase.execute(id, {
      q: searchParams.get('q') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
      ativo: parseOptionalBool(searchParams.get('ativo')),
      favorito: parseOptionalBool(searchParams.get('favorito')),
      grupoProdutoId: searchParams.get('grupoProdutoId') || undefined,
      grupoComplementosId: searchParams.get('grupoComplementosId') || undefined,
      tipo,
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
    const useCase = new AtualizarMenuProdutosBatchUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const menu = await useCase.execute(id, {
      add: body.add,
      remove: body.remove,
      update: body.update,
    })

    return NextResponse.json({ success: true, data: menu })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar produtos do menu')
  }
}
