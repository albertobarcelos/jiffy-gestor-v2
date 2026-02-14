import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

/**
 * POST /api/vendas/gestor
 * Cria uma nova venda no gestor (tabela venda_gestor)
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 })
    }

    const body = await request.json()
    
    console.log('📤 [API Route] Criando venda gestor:', {
      url: `${BACKEND_URL}/api/v1/gestor/vendas`,
      body: JSON.stringify(body, null, 2),
    })

    const response = await fetch(`${BACKEND_URL}/api/v1/gestor/vendas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    console.log('📥 [API Route] Resposta do backend:', {
      status: response.status,
      ok: response.ok,
      data: JSON.stringify(data, null, 2),
    })

    if (!response.ok) {
      console.error('❌ [API Route] Erro na resposta do backend:', {
        status: response.status,
        data,
      })
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('❌ [API Route] Erro ao criar venda gestor:', error)
    return NextResponse.json(
      { error: 'Erro interno ao criar venda', details: error.message },
      { status: 500 }
    )
  }
}
