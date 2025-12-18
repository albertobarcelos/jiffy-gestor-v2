import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * PATCH /api/terminais/[id]
 * Atualiza um terminal (especificamente o campo bloqueado)
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
      return NextResponse.json({ error: 'ID do terminal é obrigatório' }, { status: 400 })
    }

    const body = await request.json()
    const { nome, modeloDispositivo, versaoApk, bloqueado } = body

    // Validação básica
    if (bloqueado !== undefined && typeof bloqueado !== 'boolean') {
      return NextResponse.json(
        { error: 'Campo bloqueado deve ser um booleano' },
        { status: 400 }
      )
    }

    // Monta o body apenas com campos fornecidos
    const updateBody: any = {}
    if (nome !== undefined) updateBody.nome = nome
    if (modeloDispositivo !== undefined) updateBody.modeloDispositivo = modeloDispositivo
    if (versaoApk !== undefined) updateBody.versaoApk = versaoApk
    if (bloqueado !== undefined) updateBody.bloqueado = bloqueado

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/preferencias/terminais/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateBody),
      }
    )

    return NextResponse.json(response.data || { success: true })
  } catch (error) {
    console.error('Erro ao atualizar terminal:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao atualizar terminal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

