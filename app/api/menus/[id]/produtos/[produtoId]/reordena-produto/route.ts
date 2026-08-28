import { NextRequest, NextResponse } from 'next/server'
import {
  MenuRouteIdSchema,
  MenuRouteProdutoIdSchema,
  ReorderBodySchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import { ReordenarMenuProdutoUseCase } from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

/** PATCH — reordena produto dentro do grupo no menu */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const produtoMenuId = parseMenuRouteInput(MenuRouteProdutoIdSchema, produtoId)
    const body = parseMenuRouteInput(ReorderBodySchema, await req.json())
    const useCase = new ReordenarMenuProdutoUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    await useCase.execute(menuId, produtoMenuId, body.novaPosicao)

    return NextResponse.json({
      success: true,
      message: 'Ordem atualizada com sucesso',
    })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao reordenar produto do menu')
  }
}
