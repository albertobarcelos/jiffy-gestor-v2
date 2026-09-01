import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { MenuRepository } from '@/src/infrastructure/database/repositories/MenuRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { menuApiErrorResponse } from '@/src/shared/utils/menuApiRoute'

type RouteContext = { params: Promise<{ id: string; produtoId: string }> }

const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp'])
const TAMANHO_MAXIMO_BYTES = 5_242_880

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

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ message: 'Envie um arquivo de imagem.' }, { status: 400 })
    }

    const mimeType = file.type
    if (!MIME_PERMITIDOS.has(mimeType)) {
      return NextResponse.json(
        { message: 'Use uma imagem JPEG, PNG ou WebP.' },
        { status: 400 }
      )
    }

    if (file.size > TAMANHO_MAXIMO_BYTES) {
      return NextResponse.json(
        { message: 'A imagem deve ter no máximo 5 MB.' },
        { status: 400 }
      )
    }

    const repo = new MenuRepository(new ApiClient(), validation.tokenInfo.token)
    const intent = await repo.criarUploadIntentProduto(id, produtoId, {
      fileName: file.name || 'produto.jpg',
      mimeType,
      sizeInBytes: file.size,
    })

    const bytes = new Uint8Array(await file.arrayBuffer())
    const upload = await fetch(intent.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': mimeType },
      body: bytes,
    })

    if (!upload.ok) {
      return NextResponse.json(
        { message: 'Não foi possível enviar a imagem para o armazenamento.' },
        { status: 502 }
      )
    }

    await repo.confirmarUploadIntent(intent.uploadIntentId)
    const produto = await repo.buscarProduto(id, produtoId)

    return NextResponse.json({ success: true, data: produto })
  } catch (error) {
    return menuApiErrorResponse(error, 'Erro ao atualizar imagem do produto no menu')
  }
}
