import { validateRequest } from '@/src/shared/utils/validateRequest'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/nfe/[id]
 * Visualiza o DANFE (PDF) de uma NFe emitida
 * Faz proxy para o backend principal (seguindo GUIA-BACKEND.md)
 * 
 * Fluxo correto: Frontend → Next.js API Route → Backend Principal → App-Service → FiscalGateway → Microserviço Fiscal
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string | undefined
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const paramsData = await params
    id = paramsData.id
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
    // O backend principal chama o App-Service, que chama o FiscalGateway
    const backendUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || 'http://localhost:3000'
    const url = `${backendUrl}/api/v1/fiscal/documentos/${id}/danfe`

    console.log('[NFe Route] Fazendo proxy para backend:', { url, documentId: id })

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    if (!response.ok) {
      // Se for 404, retornar mensagem amigável
      if (response.status === 404) {
        // Tentar extrair mensagem mais específica do backend
        let errorMessage = 'DANFE não encontrado. O PDF pode ainda estar sendo gerado. Tente novamente em alguns instantes.'
        try {
          const errorText = await response.text()
          if (errorText) {
            try {
              const errorData = JSON.parse(errorText)
              if (errorData.message) {
                errorMessage = errorData.message
              }
            } catch {
              // Se não for JSON, usar o texto direto se contiver informação útil
              if (errorText.includes('ainda não foi gerado') || errorText.includes('não foi gerado')) {
                errorMessage = errorText
              }
            }
          }
        } catch {
          // Ignorar erro ao ler resposta
        }
        
        return NextResponse.json(
          { 
            error: errorMessage,
            retryAfter: 5, // Sugerir retry após 5 segundos
          },
          { status: 404 }
        )
      }

      // Para outros erros, tentar extrair mensagem do JSON
      try {
        const errorData = await response.json()
        return NextResponse.json(
          { error: errorData.message || errorData.error || 'Erro ao buscar DANFE' },
          { status: response.status }
        )
      } catch {
        return NextResponse.json(
          { error: `Erro ${response.status}: ${response.statusText}` },
          { status: response.status }
        )
      }
    }

    // Retornar o PDF
    const pdfBuffer = await response.arrayBuffer()
    const pdfBytes = Buffer.from(pdfBuffer)

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="DANFE_${id}.pdf"`,
        'Content-Length': pdfBytes.length.toString(),
      },
    })
  } catch (error) {
    console.error('[NFe Route] Erro ao buscar DANFE:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      documentId: id,
    })
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao buscar DANFE',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
