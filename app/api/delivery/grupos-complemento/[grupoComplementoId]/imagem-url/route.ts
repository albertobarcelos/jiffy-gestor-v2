import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { resolveGrupoComplementoImagemUrlFromDeliveryCatalog } from '@/src/shared/utils/resolveDeliveryCatalogImagemUrl'

/**
 * GET /api/delivery/grupos-complemento/[grupoComplementoId]/imagem-url
 * Resolve imagemUrl do grupo no catálogo delivery (imageId → URL pública).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ grupoComplementoId: string }> }
) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { grupoComplementoId } = await params
  if (!grupoComplementoId?.trim()) {
    return NextResponse.json(
      { error: 'ID do grupo de complementos é obrigatório' },
      { status: 400 }
    )
  }

  try {
    const apiClient = new ApiClient()
    const imagemUrl = await resolveGrupoComplementoImagemUrlFromDeliveryCatalog(
      apiClient,
      validation.tokenInfo.token,
      grupoComplementoId.trim()
    )

    return NextResponse.json({ imagemUrl })
  } catch (error) {
    console.error('Erro ao resolver imagem do grupo de complementos:', error)
    return NextResponse.json({ imagemUrl: null })
  }
}
