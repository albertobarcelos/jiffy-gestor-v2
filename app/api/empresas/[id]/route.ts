import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/empresas/[id]
 * Busca uma empresa por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID da empresa é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/empresas/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar empresa' },
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
 * PATCH /api/empresas/[id]
 * Atualiza uma empresa
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID da empresa é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    console.log('📥 API Route - Atualizando empresa:', {
      id,
      body: JSON.stringify(body, null, 2),
    })

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/empresas/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('📥 API Route - Resposta da API externa:', {
      status: response.status,
      data: response.data,
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar empresa' },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


