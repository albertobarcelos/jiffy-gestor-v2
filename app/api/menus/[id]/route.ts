import { NextRequest, NextResponse } from 'next/server'
import {
  MenuRouteIdSchema,
  UpdateMenuBodySchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import {
  AtualizarMenuUseCase,
  BuscarMenuPorIdUseCase,
  ExcluirMenuUseCase,
} from '@/src/application/use-cases/menus/menuCadastroUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/menus/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const useCase = new BuscarMenuPorIdUseCase(createMenuRepository(validation.tokenInfo.token))
    const menu = await useCase.execute(menuId)

    return NextResponse.json({ success: true, data: menu })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao buscar menu')
  }
}

/** PATCH /api/menus/:id — dados cadastrais (não vincula produtos) */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const body = parseMenuRouteInput(UpdateMenuBodySchema, await req.json())
    const useCase = new AtualizarMenuUseCase(createMenuRepository(validation.tokenInfo.token))
    const menu = await useCase.execute(menuId, body)

    return NextResponse.json({ success: true, data: menu })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao atualizar menu')
  }
}

/** DELETE /api/menus/:id — soft delete (menu principal bloqueado no backend) */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const useCase = new ExcluirMenuUseCase(createMenuRepository(validation.tokenInfo.token))
    await useCase.execute(menuId)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao excluir menu')
  }
}
