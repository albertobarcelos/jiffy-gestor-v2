import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { resolveProdutoImagemUrlFromDeliveryCatalog } from '@/src/shared/utils/resolveDeliveryCatalogImagemUrl'

/**
 * GET /api/delivery/produtos/[produtoId]/imagem-url
 * Resolve imagemUrl do produto no catálogo delivery (imageId → URL pública).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ produtoId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { produtoId } = await params
  if (!produtoId?.trim()) {
    return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 })
  }

  try {
    const apiClient = new ApiClient()
    const imagemUrl = await resolveProdutoImagemUrlFromDeliveryCatalog(
      apiClient,
      validation.tokenInfo.token,
      produtoId.trim()
    )

    return NextResponse.json({ imagemUrl })
  } catch (error) {
    console.error('Erro ao resolver imagem do produto:', error)
    return NextResponse.json({ imagemUrl: null })
  }
}
