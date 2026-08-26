import { NextRequest, NextResponse } from 'next/server'
import { AtualizarMenuGrupoUseCase } from '@/src/application/use-cases/menus/menuGrupoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; grupoProdutoId: string }> }

/** PATCH — renomeia grupo no snapshot do menu */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, grupoProdutoId } = await params
    const body = await req.json()
    const useCase = new AtualizarMenuGrupoUseCase(createMenuRepository(validation.tokenInfo.token))
    const grupo = await useCase.execute(id, grupoProdutoId, body.nome ?? '')

    return NextResponse.json({ success: true, data: grupo })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar grupo do menu')
  }
}
