import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/preferencias-terminal?limit=100&offset=0&q=
 * Lista preferências de terminais (paginado) — reduz N chamadas por GET individual
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'
    const q = searchParams.get('q') || ''

    const params = new URLSearchParams({
      limit,
      offset,
    })
    if (q) {
      params.append('q', q)
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      `/api/v1/preferencias/preferencias-terminal?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // Repassa o payload do backend (items, count, page, etc.)
    return NextResponse.json(response.data ?? { items: [] })
  } catch (error) {
    console.error('Erro ao listar preferências de terminais:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao listar preferências de terminais' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/preferencias-terminal
 * Atualiza preferências de um terminal
 */
export async function PUT(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    const { terminaisId, fields } = body

    if (!terminaisId) {
      return NextResponse.json(
        { error: 'ID do terminal é obrigatório' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/preferencias/preferencias-terminal`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ terminaisId, fields }),
      }
    )

    return NextResponse.json(response.data || { success: true })
  } catch (error) {
    console.error('Erro ao atualizar preferências do terminal:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar preferências do terminal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

