import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * GET /api/importacao/modelo
 * Download da planilha modelo para importação
 * Retorna o arquivo modelo_importacao.xlsx
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const baseUrl = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || ''
    if (!baseUrl) {
      return NextResponse.json(
        { error: 'URL base da API não configurada' },
        { status: 500 }
      )
    }

    // Fazer requisição direta para a API externa para obter o arquivo binário
    // (não podemos usar ApiClient pois ele espera JSON, e aqui precisamos de blob)
    const response = await fetch(`${baseUrl}/api/v1/importacao/modelo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Não autenticado' },
          { status: 401 }
        )
      }
      
      const errorText = await response.text().catch(() => '')
      let errorMessage = `Erro ao baixar planilha modelo: ${response.statusText}`
      
      try {
        const errorData = errorText ? JSON.parse(errorText) : {}
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // Se não conseguir fazer parse, usa a mensagem padrão
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    // Obter o arquivo como blob
    const blob = await response.blob()

    // Retornar o arquivo com headers apropriados para download
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modelo_importacao.xlsx"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Erro ao baixar planilha modelo:', error)
    
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao baixar planilha modelo' },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor ao baixar planilha modelo' },
      { status: 500 }
    )
  }
}

