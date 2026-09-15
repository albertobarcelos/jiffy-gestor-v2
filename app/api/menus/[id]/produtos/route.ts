import { NextRequest, NextResponse } from 'next/server'
import {
  ListarMenuProdutosQuerySchema,
  MenuRouteIdSchema,
  UpdateMenuProdutosBatchBodySchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import {
  AtualizarMenuProdutosBatchUseCase,
  ListarMenuProdutosUseCase,
} from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import {
  menuZodErrorResponse,
  parseMenuRouteInput,
  searchParamsToRecord,
} from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/menus/:id/produtos — snapshots MenuProduto */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const { searchParams } = new URL(req.url)
    const query = parseMenuRouteInput(
      ListarMenuProdutosQuerySchema,
      searchParamsToRecord(searchParams)
    )

    const useCase = new ListarMenuProdutosUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const result = await useCase.execute(menuId, query)

    return NextResponse.json(
      { success: true, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao listar produtos do menu')
  }
}

/** PATCH /api/menus/:id/produtos — add / remove / update em lote */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const body = parseMenuRouteInput(UpdateMenuProdutosBatchBodySchema, await req.json())
    const useCase = new AtualizarMenuProdutosBatchUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const menu = await useCase.execute(menuId, body)

    return NextResponse.json({ success: true, data: menu })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao atualizar produtos do menu')
  }
}
