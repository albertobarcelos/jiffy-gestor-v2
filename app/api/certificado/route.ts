import { NextRequest, NextResponse } from 'next/server'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

const BACKEND_URL = process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL || 'http://localhost:3000'

/**
 * POST /api/certificado - Cadastrar certificado digital
 */
export async function POST(req: NextRequest) {
  // Forçar saída no terminal (stderr sempre aparece)
  console.error('[CERTIFICADO] 🚀 API Route /api/certificado chamada!')
  console.log('[CERTIFICADO] 🚀 API Route /api/certificado chamada!')
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const logData = {
      uf: body.uf,
      ambiente: body.ambiente,
      cnpj: body.cnpj?.substring(0, 4) + '...',
      aliasCertificado: body.aliasCertificado,
    }
    console.error('[CERTIFICADO] 📨 Backend proxy recebeu:', JSON.stringify(logData, null, 2))
    console.log('[CERTIFICADO] 📨 Backend proxy recebeu:', logData)
    
    // Log do token (apenas para debug - não mostrar completo)
    const tokenPreview = tokenInfo.token ? 
      `${tokenInfo.token.substring(0, 20)}... (${tokenInfo.token.length} chars)` : 
      'TOKEN AUSENTE'
    console.error('[CERTIFICADO] 🔑 Token sendo enviado:', tokenPreview)
    console.error('[CERTIFICADO] 🔑 EmpresaId do token:', tokenInfo.empresaId)

    // ✅ Arquitetura correta: Frontend → Next.js API Route → jiffy-backend → App-Services → FiscalGateway → FiscalService
    // Enviar para o jiffy-backend
    const response = await fetch(`${BACKEND_URL}/api/v1/fiscal/certificados`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    console.error('[CERTIFICADO] 📥 Fiscal service respondeu:', response.status)
    console.log('[CERTIFICADO] 📥 Fiscal service respondeu:', response.status)

    if (!response.ok) {
      let errorData: any = {}
      let errorText = ''
      
      try {
        errorText = await response.text()
        console.error('❌ Fiscal service resposta (texto):', errorText)
        
        if (errorText) {
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            // Se não for JSON, usa o texto como mensagem
            errorData = { message: errorText || 'Erro ao cadastrar certificado' }
          }
        }
      } catch (e) {
        console.error('❌ Erro ao ler resposta do fiscal service:', e)
        errorData = { message: 'Erro ao processar resposta do servidor' }
      }
      
      console.error('❌ Fiscal service erro:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorData,
        text: errorText
      })
      
      // Retorna mensagem específica do fiscal service ou genérica
      const errorMessage = errorData.message || 
                          errorData.error || 
                          (response.status === 403 ? 'Acesso negado. Verifique se o token JWT é válido e se você tem permissão.' : 
                           `Erro ao cadastrar certificado (${response.status})`)
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao cadastrar certificado:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/certificado - Buscar certificado cadastrado
 */
export async function GET(req: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // ✅ Arquitetura correta: Frontend → Next.js API Route → jiffy-backend → App-Services → FiscalGateway → FiscalService
    // Buscar do jiffy-backend
    const response = await fetch(`${BACKEND_URL}/api/v1/fiscal/certificados/ativo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    // Tratar "nenhum certificado encontrado" como sucesso (data: null)
    // O fiscal service pode retornar 404 ou 503 com essa mensagem
    let errorData: any = {}
    let errorText = ''
    
    if (!response.ok) {
      try {
        errorText = await response.text()
        
        if (errorText) {
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            errorData = { message: errorText || 'Erro ao buscar certificado' }
          }
        }
      } catch (e) {
        console.error('[CERTIFICADO GET] ❌ Erro ao ler resposta do fiscal service:', e)
      }
      
      // Se a mensagem indica que não há certificado, tratar como sucesso (data: null)
      const mensagem = errorData.message || errorData.error || ''
      const isNenhumCertificado = 
        response.status === 404 || 
        (response.status === 503 && (
          mensagem.toLowerCase().includes('nenhum certificado') ||
          mensagem.toLowerCase().includes('não encontrado') ||
          mensagem.toLowerCase().includes('not found')
        ))
      
      if (isNenhumCertificado) {
        // Nenhum certificado encontrado - não é um erro, apenas ausência de dados
        return NextResponse.json({ success: true, data: null })
      }
      
      // Outros erros são tratados como erro real
      console.error('[CERTIFICADO GET] ❌ Fiscal service erro:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
        text: errorText
      })
      
      const errorMessage = errorData.message || 
                          errorData.error || 
                          `Erro ao buscar certificado (${response.status})`
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('[CERTIFICADO GET] ✅ Certificado encontrado:', { 
      id: data.id, 
      uf: data.uf, 
      ambiente: data.ambiente 
    })
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[CERTIFICADO GET] ❌ Erro ao buscar certificado:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/certificado - Remover certificado cadastrado
 */
export async function DELETE(req: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Extrair parâmetros da query string
    const { searchParams } = new URL(req.url)
    const ambiente = searchParams.get('ambiente')

    // UF não é mais necessária - uma empresa tem apenas UMA configuração por ambiente
    if (!ambiente) {
      return NextResponse.json(
        { success: false, message: 'Ambiente é obrigatório' },
        { status: 400 }
      )
    }

    console.log('[CERTIFICADO DELETE] 🗑️ Removendo certificado:', {
      empresaId: tokenInfo.empresaId,
      ambiente
    })

    // ✅ Arquitetura correta: Frontend → Next.js API Route → jiffy-backend → App-Services → FiscalGateway → FiscalService
    // Segurança: empresaId é extraído do JWT pelo backend, não mais passado na URL
    const response = await fetch(
      `${BACKEND_URL}/api/v1/fiscal/certificados/me?ambiente=${ambiente}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    )

    if (response.status === 404) {
      return NextResponse.json(
        { success: false, message: 'Certificado não encontrado' },
        { status: 404 }
      )
    }

    if (!response.ok) {
      let errorData: any = {}
      let errorText = ''
      
      try {
        errorText = await response.text()
        console.error('[CERTIFICADO DELETE] ❌ Fiscal service resposta (texto):', errorText)
        
        if (errorText) {
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            errorData = { message: errorText || 'Erro ao remover certificado' }
          }
        }
      } catch (e) {
        console.error('[CERTIFICADO DELETE] ❌ Erro ao ler resposta do fiscal service:', e)
        errorData = { message: 'Erro ao processar resposta do servidor' }
      }
      
      const errorMessage = errorData.message || 
                          errorData.error || 
                          `Erro ao remover certificado (${response.status})`
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      )
    }

    console.log('[CERTIFICADO DELETE] ✅ Certificado removido com sucesso')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[CERTIFICADO DELETE] ❌ Erro ao remover certificado:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
