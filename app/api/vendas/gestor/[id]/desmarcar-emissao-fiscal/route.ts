import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/vendas/gestor/[id]/desmarcar-emissao-fiscal
 * Desmarca a solicitação de emissão fiscal (solicitarEmissaoFiscal = false).
 * A venda volta a aparecer na coluna Finalizadas no Kanban.
 * Chama PUT no backend com body { solicitarEmissaoFiscal: false }.
 * Nota: se o backend não expuser PUT para vendas gestor, será necessário
 * criar um endpoint específico (ex: desmarcar-emissao-fiscal) no backend.
 */
export async function POST(
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

    const apiClient = new ApiClient()
    const response = await apiClient.request<any>(
      `/api/v1/gestor/vendas/${id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ solicitarEmissaoFiscal: false }),
      }
    )

    return NextResponse.json(response.data || {})
  } catch (error) {
    console.error('Erro ao desmarcar emissão fiscal (gestor):', error)
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao desmarcar emissão fiscal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
