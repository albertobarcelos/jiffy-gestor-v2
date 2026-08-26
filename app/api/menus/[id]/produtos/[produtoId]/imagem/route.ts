import { NextRequest, NextResponse } from 'next/server'
import { UploadImagemMenuProdutoUseCase } from '@/src/application/use-cases/menus/menuProdutoUseCases'
import { createMenuRepository } from '@/src/infrastructure/database/repositories/createMenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

/**
 * POST /api/menus/:id/produtos/:produtoId/imagem
 * Envia o arquivo no BFF (intent → PUT no storage → confirm) para evitar CORS no browser.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id, produtoId } = await params
    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Envie um arquivo de imagem.' }, { status: 400 })
    }

    const useCase = new UploadImagemMenuProdutoUseCase(
      createMenuRepository(validation.tokenInfo.token)
    )
    const produto = await useCase.execute({ menuId: id, produtoId, file })

    return NextResponse.json({ success: true, data: produto })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar imagem do produto no menu')
  }
}
