import { NextRequest, NextResponse } from 'next/server'
import {
  ListarMenuGruposQuerySchema,
  MenuRouteIdSchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import { ListarMenuGruposUseCase } from '@/src/application/use-cases/menus/menuGrupoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import {
  menuZodErrorResponse,
  parseMenuRouteInput,
  searchParamsToRecord,
} from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/menus/:id/grupos-produtos — snapshots MenuGrupoProduto */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const { searchParams } = new URL(req.url)
    const query = parseMenuRouteInput(
      ListarMenuGruposQuerySchema,
      searchParamsToRecord(searchParams)
    )

    const useCase = new ListarMenuGruposUseCase(createMenuRepository(validation.tokenInfo.token))
    const result = await useCase.execute(menuId, query)

    return NextResponse.json(
      { success: true, ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao listar grupos do menu')
  }
}
