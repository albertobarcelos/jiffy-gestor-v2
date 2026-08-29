import { NextRequest, NextResponse } from 'next/server'
import {
  MenuRouteIdSchema,
  MenuRouteProdutoIdSchema,
  UpdateMenuProdutoInputSchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import {
  AtualizarMenuProdutoUseCase,
  BuscarMenuProdutoUseCase,
} from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

/** GET /api/menus/:id/produtos/:produtoId */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const produtoMenuId = parseMenuRouteInput(MenuRouteProdutoIdSchema, produtoId)
    const useCase = new BuscarMenuProdutoUseCase(createMenuRepository(validation.tokenInfo.token))
    const produto = await useCase.execute(menuId, produtoMenuId)

    return NextResponse.json({ success: true, data: produto })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao buscar produto do menu')
  }
}

/** PATCH /api/menus/:id/produtos/:produtoId — edita snapshot */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const produtoMenuId = parseMenuRouteInput(MenuRouteProdutoIdSchema, produtoId)
    const body = parseMenuRouteInput(UpdateMenuProdutoInputSchema, await req.json())
    const useCase = new AtualizarMenuProdutoUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const produto = await useCase.execute(menuId, produtoMenuId, body)

    return NextResponse.json({ success: true, data: produto })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao atualizar produto do menu')
  }
}
