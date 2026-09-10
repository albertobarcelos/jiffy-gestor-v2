import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/delivery/empresas/me/areas-entrega
 * Proxy para GET /api/v1/delivery/empresas/me/areas-entrega
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      '/api/v1/delivery/empresas/me/areas-entrega',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          Accept: 'application/json',
        },
      }
    )

    return NextResponse.json(response.data ?? [])
  } catch (error) {
    console.error('Erro ao listar áreas de entrega delivery:', error)
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
 * POST /api/delivery/empresas/me/areas-entrega
 * Proxy para POST /api/v1/delivery/empresas/me/areas-entrega
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await request.json()
    const apiClient = new ApiClient()
    const response = await apiClient.request<unknown>(
      '/api/v1/delivery/empresas/me/areas-entrega',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validation.tokenInfo.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data ?? {}, { status: response.status || 201 })
  } catch (error) {
    console.error('Erro ao criar área de entrega delivery:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
