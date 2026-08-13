import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'
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

    if (!body?.nome || typeof body.nome !== 'string' || !body.nome.trim()) {
      return NextResponse.json({ message: 'Nome é obrigatório' }, { status: 400 })
    }

    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const grupo = await repo.atualizarGrupo(id, grupoProdutoId, body.nome.trim())

    return NextResponse.json({ success: true, data: grupo })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar grupo do menu')
  }
}
