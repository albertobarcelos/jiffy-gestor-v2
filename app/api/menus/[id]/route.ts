import { NextRequest, NextResponse } from 'next/server'
import {
  AtualizarMenuUseCase,
  BuscarMenuPorIdUseCase,
  ExcluirMenuUseCase,
} from '@/src/application/use-cases/menus/menuCadastroUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/menus/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const useCase = new BuscarMenuPorIdUseCase(createMenuRepository(validation.tokenInfo.token))
    const menu = await useCase.execute(id)

    return NextResponse.json({ success: true, data: menu })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao buscar menu')
  }
}

/** PATCH /api/menus/:id — dados cadastrais (não vincula produtos) */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const useCase = new AtualizarMenuUseCase(createMenuRepository(validation.tokenInfo.token))
    const menu = await useCase.execute(id, {
      nome: body.nome,
      descricao: body.descricao,
      ativo: body.ativo,
    })

    return NextResponse.json({ success: true, data: menu })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar menu')
  }
}

/** DELETE /api/menus/:id — soft delete (menu principal bloqueado no backend) */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const useCase = new ExcluirMenuUseCase(createMenuRepository(validation.tokenInfo.token))
    await useCase.execute(id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao excluir menu')
  }
}
