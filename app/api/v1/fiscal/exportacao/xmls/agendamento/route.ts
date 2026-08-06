import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'
import { AgendamentoExportacaoXmlSchema } from '@/src/application/dto/painel-contador/PainelContadorDTO'

/**
 * GET /api/v1/fiscal/exportacao/xmls/agendamento
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      '/api/v1/fiscal/exportacao/xmls/agendamento',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('[Exportacao XML] Erro ao buscar agendamento:', error)
    if (error instanceof ApiError) {
      if (error.status === 404) {
        return NextResponse.json(null)
      }
      return NextResponse.json(
        { error: error.message || 'Erro ao buscar agendamento' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PUT /api/v1/fiscal/exportacao/xmls/agendamento
 */
export async function PUT(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()
    const parsed = AgendamentoExportacaoXmlSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Parâmetros inválidos' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      '/api/v1/fiscal/exportacao/xmls/agendamento',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
        body: JSON.stringify(parsed.data),
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('[Exportacao XML] Erro ao salvar agendamento:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao salvar agendamento' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/fiscal/exportacao/xmls/agendamento
 */
export async function DELETE(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const apiClient = new ApiClient()
    await apiClient.request<unknown>('/api/v1/fiscal/exportacao/xmls/agendamento', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Exportacao XML] Erro ao desativar agendamento:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao desativar agendamento' },
        { status: error.status }
      )
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
