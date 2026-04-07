import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/vendas/gestor/[id]
 * Busca detalhes de uma venda gestor
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
      return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.toString()
    const path = `/api/v1/gestor/vendas/${id}${query ? `?${query}` : ''}`

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      path,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return NextResponse.json(response.data || {})
  } catch (error) {
    console.error('Erro ao buscar detalhes da venda gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar detalhes da venda gestor' },
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
 * PATCH /api/vendas/gestor/[id]
 * Atualiza campos editáveis da venda gestor (ex.: solicitarEmissaoFiscal).
 * Repassa para PATCH /api/v1/gestor/vendas/:id no backend.
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
      return NextResponse.json({ error: 'ID da venda é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/gestor/vendas/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data || {})
  } catch (error) {
    console.error('Erro ao atualizar venda gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar venda gestor' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
