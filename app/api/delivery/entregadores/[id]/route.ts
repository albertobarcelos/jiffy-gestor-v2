import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/delivery/entregadores/[id]
 * Proxy para GET /api/v1/delivery/entregadores/{id}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID do entregador é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/entregadores/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    console.error('Erro ao buscar entregador delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH /api/delivery/entregadores/[id]
 * Proxy para PATCH /api/v1/delivery/entregadores/{id}
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID do entregador é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      `/api/v1/delivery/entregadores/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data ?? {})
  } catch (error) {
    console.error('Erro ao atualizar entregador delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/delivery/entregadores/[id]
 * Proxy para DELETE /api/v1/delivery/entregadores/{id} (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    if (!id?.trim()) {
      return NextResponse.json({ error: 'ID do entregador é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    await apiClient.request<unknown>(
      `/api/v1/delivery/entregadores/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Erro ao excluir entregador delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error) },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
