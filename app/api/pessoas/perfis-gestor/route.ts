import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/pessoas/perfis-gestor
 * Lista perfis gestor com paginação e busca
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const q = searchParams.get('q') || ''

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (q) {
      params.append('q', q)
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/pessoas/perfis-gestor?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    // A API retorna no formato { count, page, limit, totalPages, hasNext, hasPrevious, items }
    const apiData = response.data || {}
    
    return NextResponse.json({
      items: apiData.items || [],
      count: apiData.count || 0,
      hasNext: apiData.hasNext !== undefined ? apiData.hasNext : false,
      hasPrevious: apiData.hasPrevious !== undefined ? apiData.hasPrevious : false,
    })
  } catch (error) {
    console.error('Erro ao buscar perfis gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar perfis gestor' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pessoas/perfis-gestor
 * Cria um novo perfil gestor
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>('/api/v1/pessoas/perfis-gestor', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    return NextResponse.json(response.data, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar perfil gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao criar perfil gestor' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
