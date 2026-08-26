import { NextRequest, NextResponse } from 'next/server'
import { ReordenarMenuProdutoUseCase } from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

/** PATCH — reordena produto dentro do grupo no menu */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const body = await req.json()
    const useCase = new ReordenarMenuProdutoUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    await useCase.execute(id, produtoId, Number(body.novaPosicao))

    return NextResponse.json({
      success: true,
      message: 'Ordem atualizada com sucesso',
    })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao reordenar produto do menu')
  }
}
