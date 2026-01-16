import { NextRequest, NextResponse } from 'next/server'

/**
 * API Route para consultar CNPJ na API CNPJA (mesma usada no Flutter)
 * Faz a requisição pelo servidor para evitar problemas de CORS
 * GET /api/consulta-cnpj?cnpj=12345678000190
 * 
 * URL da API: https://open.cnpja.com/office/{cnpj}
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cnpj = searchParams.get('cnpj')

    if (!cnpj) {
      return NextResponse.json(
        { error: 'CNPJ não fornecido' },
        { status: 400 }
      )
    }

    // Remove formatação do CNPJ
    const rawCNPJ = cnpj.replace(/\D/g, '')

    if (rawCNPJ.length !== 14) {
      return NextResponse.json(
        { error: 'CNPJ deve conter 14 dígitos' },
        { status: 400 }
      )
    }

    // URL completa da API CNPJA (mesma usada no Flutter)
    const cnpjaUrl = `https://open.cnpja.com/office/${rawCNPJ}`
    console.log('🔍 Consultando CNPJ:', {
      cnpjOriginal: cnpj,
      cnpjLimpo: rawCNPJ,
      urlCompleta: cnpjaUrl,
    })

    // Cria um AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos

    // Faz requisição para a API CNPJA (mesma usada no Flutter)
    const response = await fetch(cnpjaUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    console.log('📡 Resposta da CNPJA:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      console.error('❌ Erro na resposta:', {
        status: response.status,
        errorText,
      })
      
      if (response.status === 400 || response.status === 404) {
        return NextResponse.json(
          { error: 'CNPJ inválido ou não encontrado' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Erro ao consultar CNPJ' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Dados recebidos da CNPJA:', JSON.stringify(data, null, 2))

    // Mapeia os campos conforme a estrutura da API CNPJA (igual ao Flutter)
    // nomeFantasia → $.alias
    // razaoSocial → $.company.name
    // email → $.emails[:].address (primeiro email do array)
    // numero → $.address.number
    // cep → $.address.zip
    
    const nomeFantasia = data.alias || ''
    const razaoSocial = data.company?.name || ''
    const emails = data.emails || []
    const email = emails.length > 0 ? emails[0]?.address || '' : ''
    const numero = data.address?.number || ''
    const cep = data.address?.zip || ''
    const logradouro = data.address?.street || ''
    const bairro = data.address?.district || ''
    const complemento = data.address?.details || ''
    const cidade = data.address?.city || ''
    const estado = data.address?.state || ''

    // Retorna APENAS os dados pessoais (sem endereço)
    // O endereço deve ser preenchido apenas via busca de CEP
    return NextResponse.json({
      nome: razaoSocial, // Usa razão social como nome principal
      razaoSocial: razaoSocial,
      nomeFantasia: nomeFantasia,
      email: email,
      // Campos de endereço removidos - devem ser preenchidos apenas via busca de CEP
    })
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Timeout ao consultar CNPJ. Tente novamente.' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao consultar CNPJ. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}

