import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { resolveComplementoImagemUrlFromDeliveryCatalog } from '@/src/shared/utils/resolveDeliveryCatalogImagemUrl'

/**
 * GET /api/delivery/complementos/[complementoId]/imagem-url
 * Resolve imagemUrl do complemento no catálogo delivery (imageId → URL pública).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ complementoId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { complementoId } = await params
  if (!complementoId?.trim()) {
    return NextResponse.json({ error: 'ID do complemento é obrigatório' }, { status: 400 })
  }

  try {
    const apiClient = new ApiClient()
    const imagemUrl = await resolveComplementoImagemUrlFromDeliveryCatalog(
      apiClient,
      validation.tokenInfo.token,
      complementoId.trim()
    )

    return NextResponse.json({ imagemUrl })
  } catch (error) {
    console.error('Erro ao resolver imagem do complemento:', error)
    return NextResponse.json({ imagemUrl: null })
  }
}
