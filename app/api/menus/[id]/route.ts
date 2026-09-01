import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/menus/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const menu = await repo.buscarMenuPorId(id)

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
    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const menu = await repo.atualizarMenu(id, {
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
    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    await repo.excluirMenu(id)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao excluir menu')
  }
}
