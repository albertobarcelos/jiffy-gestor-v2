import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; grupoProdutoId: string }> }

/** PATCH — reordena grupo entre os grupos ativos do menu */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, grupoProdutoId } = await params
    const body = await req.json()
    const novaPosicao = Number(body.novaPosicao)

    if (!novaPosicao || novaPosicao < 1) {
      return NextResponse.json({ message: 'Nova posição inválida' }, { status: 400 })
    }

    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    await repo.reordenarGrupo(id, grupoProdutoId, novaPosicao)

    return NextResponse.json({
      success: true,
      message: 'Ordem atualizada com sucesso',
    })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao reordenar grupo do menu')
  }
}
