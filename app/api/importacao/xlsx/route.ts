import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiError } from '@/src/infrastructure/api/apiClient'

/**
 * POST /api/importacao/xlsx
 * Importa cadastros via planilha XLSX
 * Recebe a planilha .xlsx e faz o cadastro de todos os itens preenchidos
 */
export async function POST(request: NextRequest) {
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

    // Obter o FormData da requisição
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    console.log('📤 Enviando arquivo para API externa:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      baseUrl: `${baseUrl}/api/v1/importacao/xlsx`,
    })

    // Criar novo FormData para enviar à API externa
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)

    // Fazer requisição para a API externa com timeout aumentado
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 segundos de timeout

    try {
      const response = await fetch(`${baseUrl}/api/v1/importacao/xlsx`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          // Não definir Content-Type aqui, o browser define automaticamente com boundary para multipart/form-data
        },
        body: uploadFormData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log('📥 Resposta da API externa:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json(
            { error: 'Não autenticado' },
            { status: 401 }
          )
        }

        const errorText = await response.text().catch(() => '')
        let errorData: any = {}

        try {
          errorData = errorText ? JSON.parse(errorText) : {}
        } catch {
          // Se não conseguir fazer parse, usa a mensagem padrão
          errorData = { message: `Erro ${response.status}: ${response.statusText}` }
        }

        console.error('❌ Erro na resposta da API:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        })

        return NextResponse.json(
          {
            error: errorData.message || errorData.error || 'Erro ao processar planilha',
            ...errorData,
          },
          { status: response.status }
        )
      }

      // Obter a resposta JSON
      const data = await response.json()
      console.log('✅ Upload concluído com sucesso')

      return NextResponse.json(data)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ Timeout ao fazer upload da planilha')
        return NextResponse.json(
          { error: 'Timeout ao processar planilha. O arquivo pode ser muito grande ou a API está demorando para responder.' },
          { status: 504 }
        )
      }

      console.error('❌ Erro ao fazer requisição para API externa:', fetchError)
      return NextResponse.json(
        { 
          error: 'Erro ao comunicar com a API externa',
          details: fetchError.message || 'Erro desconhecido'
        },
        { status: 502 }
      )
    }
  } catch (error) {
    console.error('❌ Erro ao fazer upload da planilha:', error)

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || 'Erro ao fazer upload da planilha' },
        { status: error.status }
      )
    }

    return NextResponse.json(
      { 
        error: 'Erro interno do servidor ao processar planilha',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

