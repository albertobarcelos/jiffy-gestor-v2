import { NextRequest, NextResponse } from 'next/server'
import {
  MenuRouteGrupoProdutoIdSchema,
  MenuRouteIdSchema,
  ReorderBodySchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import { ReordenarMenuGrupoUseCase } from '@/src/application/use-cases/menus/menuGrupoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; grupoProdutoId: string }> }

/** PATCH — reordena grupo entre os grupos ativos do menu */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, grupoProdutoId } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const grupoId = parseMenuRouteInput(MenuRouteGrupoProdutoIdSchema, grupoProdutoId)
    const body = parseMenuRouteInput(ReorderBodySchema, await req.json())
    const useCase = new ReordenarMenuGrupoUseCase(createMenuRepository(validation.tokenInfo.token))
    await useCase.execute(menuId, grupoId, body.novaPosicao)

    return NextResponse.json({
      success: true,
      message: 'Ordem atualizada com sucesso',
    })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao reordenar grupo do menu')
  }
}
