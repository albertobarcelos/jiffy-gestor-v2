import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { resolveGruposComplementoImagemUrlsFromDeliveryCatalog } from '@/src/shared/utils/resolveDeliveryCatalogImagemUrl'

/**
 * POST /api/delivery/grupos-complemento/imagem-urls
 * Resolve imagemUrl de vários grupos de complemento (catálogo delivery, 1ª página).
 */
export async function POST(request: NextRequest) {
  const validation = validateRequest(request)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  try {
    const body = (await request.json()) as { ids?: unknown }
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : []

    if (ids.length === 0) {
      return NextResponse.json({ imagensPorGrupoComplementoId: {} })
    }

    const apiClient = new ApiClient()
    const imagensPorGrupoComplementoId =
      await resolveGruposComplementoImagemUrlsFromDeliveryCatalog(
        apiClient,
        validation.tokenInfo.token,
        ids
      )

    return NextResponse.json({ imagensPorGrupoComplementoId })
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }
}
