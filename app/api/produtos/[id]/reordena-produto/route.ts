import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient } from '@/src/infrastructure/api/apiClient'

/**
 * PATCH - Reordenar produto dentro de um grupo
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = validateRequest(req)
  if (!validation.valid || !validation.tokenInfo) {
    return validation.error!
  }

  const { id } = await params
  const body = await req.json()
  const novaPosicao = Number(body?.novaPosicao)

  if (!id) {
    return NextResponse.json(
      { message: 'Produto não informado' },
      { status: 400 }
    )
  }

  if (!novaPosicao || novaPosicao < 1) {
    return NextResponse.json(
      { message: 'Nova posição inválida' },
      { status: 400 }
    )
  }

  try {
    const apiClient = new ApiClient()

    await apiClient.request(
      `/api/v1/cardapio/produtos/${id}/reordena-produto`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ novaPosicao }),
      }
    )

    return NextResponse.json({ success: true, message: 'Ordem do produto atualizada' })
  } catch (error: any) {
    console.error('Erro ao reordenar produto:', error)
    return NextResponse.json(
      { message: error.message || 'Erro ao reordenar produto' },
      { status: error.status || 500 }
    )
  }
}

