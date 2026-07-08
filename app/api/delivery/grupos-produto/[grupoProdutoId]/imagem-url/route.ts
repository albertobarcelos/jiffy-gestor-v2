import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { resolveGrupoProdutoImagemUrlFromDeliveryCatalog } from '@/src/shared/utils/resolveDeliveryCatalogImagemUrl'

/**
 * GET /api/delivery/grupos-produto/[grupoProdutoId]/imagem-url
 * Resolve imagemUrl do grupo no catálogo delivery (imageId → URL pública).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ grupoProdutoId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { grupoProdutoId } = await params
  if (!grupoProdutoId?.trim()) {
    return NextResponse.json({ error: 'ID do grupo de produtos é obrigatório' }, { status: 400 })
  }

  try {
    const apiClient = new ApiClient()
    const imagemUrl = await resolveGrupoProdutoImagemUrlFromDeliveryCatalog(
      apiClient,
      validation.tokenInfo.token,
      grupoProdutoId.trim()
    )

    return NextResponse.json({ imagemUrl })
  } catch (error) {
    console.error('Erro ao resolver imagem do grupo de produtos:', error)
    return NextResponse.json({ imagemUrl: null })
  }
}
