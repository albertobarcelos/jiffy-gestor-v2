import { NextRequest, NextResponse } from 'next/server'
import {
  MenuRouteIdSchema,
  MenuRouteProdutoIdSchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import { ReordenarComplementoNoMenuUseCase } from '@/src/application/use-cases/complementos/ReordenarComplementoNoMenuUseCase'
import { ComplementoOverrideRepository } from '@/src/infrastructure/database/repositories/ComplementoOverrideRepository'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'
import { validateRequest } from '@/src/shared/utils/validateRequest'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

/** PATCH — reordena um complemento dentro do grupo, no produto deste cardápio. */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const produtoMenuId = parseMenuRouteInput(MenuRouteProdutoIdSchema, produtoId)
    const useCase = new ReordenarComplementoNoMenuUseCase(
      new ComplementoOverrideRepository(undefined, validation.tokenInfo.token)
    )
    await useCase.execute(menuId, produtoMenuId, await req.json())

    return NextResponse.json({
      success: true,
      message: 'Ordem do complemento atualizada com sucesso',
    })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao reordenar complemento')
  }
}
