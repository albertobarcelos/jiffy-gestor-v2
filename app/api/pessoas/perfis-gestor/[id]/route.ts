import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/pessoas/perfis-gestor/[id]
 * Busca um perfil gestor por ID
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
      return NextResponse.json({ error: 'ID do perfil gestor é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/pessoas/perfis-gestor/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar perfil gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar perfil gestor' },
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
 * PATCH /api/pessoas/perfis-gestor/[id]
 * Atualiza um perfil gestor
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
      return NextResponse.json({ error: 'ID do perfil gestor é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    console.log('🔍 [perfis-gestor] Atualizando perfil gestor:', { id, body })

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(`/api/v1/pessoas/perfis-gestor/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('✅ [perfis-gestor] Resposta da atualização:', response.data)
    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao atualizar perfil gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar perfil gestor' },
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
 * DELETE /api/pessoas/perfis-gestor/[id]
 * Deleta um perfil gestor
 */
export async function DELETE(
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
      return NextResponse.json({ error: 'ID do perfil gestor é obrigatório' }, { status: 400 })
    }

    const apiClient = new ApiClient()
    await apiClient.request<any>(`/api/v1/pessoas/perfis-gestor/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json({ message: 'Perfil gestor deletado com sucesso' }, { status: 200 })
  } catch (error) {
    console.error('Erro ao deletar perfil gestor:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao deletar perfil gestor' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
