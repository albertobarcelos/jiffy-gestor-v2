import { NextRequest, NextResponse } from 'next/server'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

const FISCAL_SERVICE_URL = process.env.FISCAL_SERVICE_URL || 'http://localhost:8081'

/**
 * GET /api/produtos-fiscais - Listar todos os produtos fiscais
 */
export async function GET(req: NextRequest) {
  console.error('[PRODUTOS-FISCAIS] 🚀 API Route /api/produtos-fiscais chamada!')
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      console.error('[PRODUTOS-FISCAIS] ❌ Token não encontrado')
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    console.error('[PRODUTOS-FISCAIS] 🔑 Token encontrado, empresaId:', tokenInfo.empresaId)
    console.error('[PRODUTOS-FISCAIS] 📡 Chamando fiscal service:', `${FISCAL_SERVICE_URL}/v1/produtos-fiscais`)

    const response = await fetch(`${FISCAL_SERVICE_URL}/v1/produtos-fiscais`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
      },
    })

    console.error('[PRODUTOS-FISCAIS] 📥 Fiscal service respondeu:', response.status)

    if (!response.ok) {
      let errorData: any = {}
      let errorText = ''
      
      try {
        errorText = await response.text()
        console.error('[PRODUTOS-FISCAIS] ❌ Fiscal service resposta (texto):', errorText)
        
        if (errorText) {
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            errorData = { message: errorText || 'Erro ao buscar produtos fiscais' }
          }
        }
      } catch (e) {
        console.error('[PRODUTOS-FISCAIS] ❌ Erro ao ler resposta do fiscal service:', e)
        errorData = { message: 'Erro ao processar resposta do servidor' }
      }
      
      console.error('[PRODUTOS-FISCAIS] ❌ Fiscal service erro:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
        text: errorText
      })
      
      const errorMessage = errorData.message || 
                          errorData.error || 
                          `Erro ao buscar produtos fiscais (${response.status})`
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      )
    }

    let data: any = {}
    try {
      const responseText = await response.text()
      if (responseText) {
        data = JSON.parse(responseText)
      } else {
        // Resposta vazia - retorna estrutura padrão
        data = { produtos: [], total: 0 }
      }
    } catch (e) {
      console.error('[PRODUTOS-FISCAIS] ⚠️ Erro ao fazer parse do JSON:', e)
      // Se não conseguir fazer parse, retorna estrutura padrão
      data = { produtos: [], total: 0 }
    }
    
    console.error('[PRODUTOS-FISCAIS] ✅ Dados recebidos:', { total: data?.total || 0 })
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[PRODUTOS-FISCAIS] ❌ Erro ao buscar produtos fiscais:', error)
    console.error('[PRODUTOS-FISCAIS] ❌ Stack trace:', error.stack)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/produtos-fiscais - Criar ou atualizar produto fiscal
 */
export async function POST(req: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const body = await req.json()

    const response = await fetch(`${FISCAL_SERVICE_URL}/v1/produtos-fiscais`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenInfo.token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      let errorData: any = {}
      let errorText = ''
      
      try {
        errorText = await response.text()
        if (errorText) {
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            errorData = { message: errorText || 'Erro ao salvar produto fiscal' }
          }
        }
      } catch (e) {
        errorData = { message: 'Erro ao processar resposta do servidor' }
      }
      
      const errorMessage = errorData.message || 
                          errorData.error || 
                          `Erro ao salvar produto fiscal (${response.status})`
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Erro ao salvar produto fiscal:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Erro interno' },
      { status: 500 }
    )
  }
}
