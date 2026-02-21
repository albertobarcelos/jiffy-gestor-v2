import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/vendas/[id]/emitir-nota
 * Emite nota fiscal (NFC-e ou NF-e) para uma venda PDV
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

    const body = await request.json()

    if (!body.modelo || !body.serie || !body.ambiente || !body.crt) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: modelo, serie, ambiente, crt' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    
    // Log para debug
    console.log('[Emitir NFe] Tentando emitir NFe:', {
      vendaId: id,
      modelo: body.modelo,
      serie: body.serie,
      ambiente: body.ambiente,
      crt: body.crt,
      endpoint: `/api/v1/operacao-pdv/vendas/${id}/emitir-nfe`,
    })
    
    const response = await apiClient.request<any>(
      `/api/v1/operacao-pdv/vendas/${id}/emitir-nota`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    return NextResponse.json(response.data || {}, { status: response.status })
  } catch (error) {
    console.error('Erro ao emitir nota fiscal:', error)
    if (error instanceof ApiError) {
      // Se for 404, retornar mensagem mais específica
      if (error.status === 404) {
        return NextResponse.json(
          { 
            error: 'Venda não encontrada ou endpoint não disponível. Verifique se a venda existe e está marcada para emissão fiscal.',
            details: error.message 
          },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || 'Erro ao emitir nota fiscal' },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
