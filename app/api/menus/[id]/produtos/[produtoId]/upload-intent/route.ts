import { NextRequest, NextResponse } from 'next/server'
import { CriarUploadIntentMenuProdutoUseCase } from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
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
    const body = await req.json()
    const useCase = new CriarUploadIntentMenuProdutoUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const intent = await useCase.execute(id, produtoId, {
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeInBytes: body.sizeInBytes,
    })

    return NextResponse.json({ success: true, data: intent }, { status: 201 })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao criar upload intent')
  }
}
