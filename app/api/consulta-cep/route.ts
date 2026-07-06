import { NextRequest, NextResponse } from 'next/server'

/**
 * Consulta CEP via ViaCEP (servidor → evita CORS no browser).
 * GET /api/consulta-cep?cep=01310100 ou 01310-100
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('cep')
    if (!raw) {
      return NextResponse.json({ error: 'CEP não informado' }, { status: 400 })
    }

    const cep = raw.replace(/\D/g, '')
    if (cep.length !== 8) {
      return NextResponse.json({ error: 'CEP deve conter 8 dígitos' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao consultar CEP' },
        { status: response.status >= 400 ? response.status : 502 }
      )
    }

    const data = (await response.json()) as { erro?: boolean }

    if (data.erro === true) {
      return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Tempo esgotado ao consultar CEP' }, { status: 408 })
    }
    console.error('consulta-cep:', error)
    return NextResponse.json({ error: 'Erro interno ao consultar CEP' }, { status: 500 })
  }
}
