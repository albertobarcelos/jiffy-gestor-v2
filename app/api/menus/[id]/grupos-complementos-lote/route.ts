import { NextRequest, NextResponse } from 'next/server'
import { MenuRouteIdSchema } from '@/src/application/dto/menus/MenuInputSchemas'
import { ListarGruposComplementoDoMenuParaLoteUseCase } from '@/src/application/use-cases/complementos/ListarGruposComplementoDoMenuParaLoteUseCase'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { GrupoComplementoRepository } from '@/src/infrastructure/database/repositories/GrupoComplementoRepository'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/menus/:id/grupos-complementos-lote
 * Grupos de complementos usados no cardápio, com complementos de cada grupo
 * (contexto da tela de alterar valor/ativo em lote).
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const useCase = new ListarGruposComplementoDoMenuParaLoteUseCase(
      createMenuRepository(validation.tokenInfo.token),
      new GrupoComplementoRepository(undefined, validation.tokenInfo.token)
    )
    const grupos = await useCase.execute(menuId)

    return NextResponse.json(
      { success: true, grupos },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao listar grupos de complementos do cardápio')
  }
}
