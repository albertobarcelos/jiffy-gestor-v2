import { NextRequest, NextResponse } from 'next/server'
import {
  ImageUploadIntentBodySchema,
  MenuRouteIdSchema,
  MenuRouteProdutoIdSchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import { CriarUploadIntentMenuProdutoUseCase } from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

/**
 * POST — inicia upload de imagem do produto no menu (intent).
 * Fluxo: intent → PUT uploadUrl → POST /api/media/.../confirm (fora deste esboço).
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const produtoMenuId = parseMenuRouteInput(MenuRouteProdutoIdSchema, produtoId)
    const body = parseMenuRouteInput(ImageUploadIntentBodySchema, await req.json())
    const useCase = new CriarUploadIntentMenuProdutoUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const intent = await useCase.execute(menuId, produtoMenuId, body)

    return NextResponse.json({ success: true, data: intent }, { status: 201 })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao criar upload intent')
  }
}
