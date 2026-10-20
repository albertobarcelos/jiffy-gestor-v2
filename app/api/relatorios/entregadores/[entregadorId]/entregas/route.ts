import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { montarQueryRelatorioEntregas } from '@/src/infrastructure/relatorios/montarQueryRelatorioEntregas'

/**
 * GET /api/relatorios/entregadores/[entregadorId]/entregas
 * Proxy do detalhe de entregas de um entregador.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entregadorId: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { entregadorId } = await params
    const id = entregadorId?.trim()
    if (!id) {
      return NextResponse.json({ error: 'entregadorId é obrigatório' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const montado = montarQueryRelatorioEntregas(searchParams)
    if (!montado.ok) {
      return NextResponse.json({ error: montado.error }, { status: 400 })
    }

    const apiClient = new ApiClient()
    const path = `/api/v1/relatorios/entregadores/${encodeURIComponent(id)}/entregas?${montado.query.toString()}`
    const response = await apiClient.request<Record<string, unknown>>(path, {
      method: 'GET',
      headers: { Authorization: `Bearer ${validation.tokenInfo.token}` },
    })

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar detalhe de entregas do entregador:', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: mensagemLegivelApiError(error), details: error.data },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar detalhe de entregas' },
      { status: 500 }
    )
  }
}
