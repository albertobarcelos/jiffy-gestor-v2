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

/**
 * POST /api/terminais
 * Cria um novo terminal (proxy para POST /api/v1/preferencias/terminais)
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id.trim() : ''
    if (!id) {
      return NextResponse.json({ error: 'ID do terminal é obrigatório' }, { status: 400 })
    }

    const nome =
      typeof body.nome === 'string' && body.nome.trim() ? body.nome.trim() : undefined
    const modeloDispositivo =
      typeof body.modeloDispositivo === 'string' && body.modeloDispositivo.trim()
        ? body.modeloDispositivo.trim()
        : 'GESTOR'
    const versaoApk =
      typeof body.versaoApk === 'string' && body.versaoApk.trim()
        ? body.versaoApk.trim()
        : '0.0.0'

    const createBody: Record<string, unknown> = {
      id,
      modeloDispositivo,
      versaoApk,
    }
    if (nome !== undefined) createBody.nome = nome
    if (body.identificadorFisico !== undefined) {
      createBody.identificadorFisico = body.identificadorFisico
    }
    if (body.buildNumber !== undefined) createBody.buildNumber = body.buildNumber
    if (body.numeroSerie !== undefined) createBody.numeroSerie = body.numeroSerie

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      `/api/v1/preferencias/terminais`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createBody),
      }
    )

    return NextResponse.json(response.data || { success: true }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar terminal:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao criar terminal' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
