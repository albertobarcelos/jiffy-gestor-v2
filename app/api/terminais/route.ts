import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'
    const offset = searchParams.get('offset') || '0'
    const q = searchParams.get('q') || ''

    const apiClient = new ApiClient()
    const params = new URLSearchParams({
      limit,
      offset,
    })
    if (q) {
      params.append('q', q)
    }

    const response = await apiClient.request<{
      items?: any[]
      total?: number
      count?: number
    }>(`/api/v1/preferencias/terminais?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    // Adaptar resposta para o formato esperado
    const data = response.data
    const items = data.items || (Array.isArray(data) ? data : [])
    const itemsArray = Array.isArray(items) ? items : []
    const total = data.total || data.count || itemsArray.length
    
    return NextResponse.json({
      items: itemsArray,
      total,
      hasNextPage: itemsArray.length > parseInt(offset) + parseInt(limit),
    })
  } catch (error) {
    console.error('Erro ao buscar terminais:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar terminais' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
