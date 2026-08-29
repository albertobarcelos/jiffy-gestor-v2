import { NextRequest, NextResponse } from 'next/server'
import {
  MenuRouteGrupoProdutoIdSchema,
  MenuRouteIdSchema,
} from '@/src/application/dto/menus/MenuInputSchemas'
import { UploadImagemMenuGrupoUseCase } from '@/src/application/use-cases/menus/menuGrupoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { menuZodErrorResponse, parseMenuRouteInput } from '@/src/shared/utils/menuRouteValidation'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; grupoProdutoId: string }> }

/**
 * POST /api/menus/:id/grupos-produtos/:grupoProdutoId/imagem
 * Intent → PUT no storage → confirm, igual à imagem do produto no menu.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, grupoProdutoId } = await params
    const menuId = parseMenuRouteInput(MenuRouteIdSchema, id)
    const grupoId = parseMenuRouteInput(MenuRouteGrupoProdutoIdSchema, grupoProdutoId)
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Envie um arquivo de imagem.' }, { status: 400 })
    }

    const useCase = new UploadImagemMenuGrupoUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const { grupo, imagemUrl } = await useCase.execute({ menuId, grupoProdutoId: grupoId, file })

    return NextResponse.json({
      success: true,
      data: grupo,
      imagemUrl,
    })
  } catch (error) {
    const zodResponse = menuZodErrorResponse(error)
    if (zodResponse) return zodResponse
    return menuApiErrorResponse(error, 'Erro ao atualizar imagem do grupo no menu')
  }
}
