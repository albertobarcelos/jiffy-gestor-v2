import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

/** GET /api/menus/:id/produtos/:produtoId */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const produto = await repo.buscarProduto(id, produtoId)

    return NextResponse.json({ success: true, data: produto })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao buscar produto do menu')
  }
}

/** PATCH /api/menus/:id/produtos/:produtoId — edita snapshot */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const body = await req.json()
    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const produto = await repo.atualizarProduto(id, produtoId, body)

    return NextResponse.json({ success: true, data: produto })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar produto do menu')
  }
}
