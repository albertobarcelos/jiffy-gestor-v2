import { validateRequest } from '@/src/shared/utils/validateRequest'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/nfe/[id]/regenerar
 * Regenera o DANFE (PDF) de uma NFe emitida
 * Faz proxy para o backend principal (seguindo GUIA-BACKEND.md)
 * 
 * Fluxo correto: Frontend → Next.js API Route → Backend Principal → App-Service → FiscalGateway → Microserviço Fiscal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    if (!id) {
      return NextResponse.json({ error: 'ID do documento fiscal é obrigatório' }, { status: 400 })
    }

    // Validar formato UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'ID do documento fiscal inválido (deve ser um UUID)' },
        { status: 400 }
      )
    }

    // Fazer proxy para o backend principal (seguindo GUIA-BACKEND.md)
    const backendUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || 'http://localhost:3000'
    const url = `${backendUrl}/api/v1/fiscal/documentos/${id}/regenerar-danfe`

    console.log('[NFe Regenerar Route] Fazendo proxy para backend:', { url, documentId: id })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Tentar extrair mensagem do JSON
      try {
        const errorData = await response.json()
        return NextResponse.json(
          { error: errorData.message || errorData.error || 'Erro ao regenerar DANFE' },
          { status: response.status }
        )
      } catch {
        return NextResponse.json(
          { error: `Erro ${response.status}: ${response.statusText}` },
          { status: response.status }
        )
      }
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    const { id } = await params
    console.error('[NFe Regenerar Route] Erro ao regenerar DANFE:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      documentId: id,
    })
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao regenerar DANFE',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
