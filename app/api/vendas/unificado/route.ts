import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { enrichUnificadoItemsComModuloDelivery } from '@/src/application/mappers/EnrichUnificadoDeliveryMapper'

/**
 * GET /api/vendas/unificado
 * Proxy passthrough para GET /api/v1/vendas/unificado do backend.
 * Enriquece pedidos do módulo delivery (tipoEntrega + status) quando a view unificada omite campos.
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/vendas/unificado?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const data = response.data || {}
    const items = Array.isArray(data.items) ? data.items : []
    const itemsEnriquecidos = await enrichUnificadoItemsComModuloDelivery(
      items,
      tokenInfo.token
    )

    return NextResponse.json({ ...data, items: itemsEnriquecidos })
  } catch (error) {
    console.error('Erro ao buscar vendas unificadas:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar vendas unificadas' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
