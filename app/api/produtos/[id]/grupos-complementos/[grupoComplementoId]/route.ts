import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

/**
 * DELETE - Remove vínculo entre produto e grupo de complementos
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; grupoComplementoId: string }> }
) {
  const validation = validateRequest(req)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { id, grupoComplementoId } = await params

  if (!id || !grupoComplementoId) {
    return NextResponse.json(
      { message: 'Produto ou grupo de complementos não informado' },
      { status: 400 }
    )
  }

  try {
    const apiClient = new ApiClient()
    const targetUrl = `/api/v1/cardapio/produtos/${id}/grupos-complementos/${grupoComplementoId}`

    await apiClient.request(targetUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${validation.tokenInfo.token}`,
      },
    })

    return NextResponse.json({ success: true, message: 'Grupo removido do produto com sucesso' })
  } catch (error: any) {
    console.error('Erro ao remover grupo do produto:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao remover grupo do produto' },
      { status: error.status || 500 }
    )
  }
}


