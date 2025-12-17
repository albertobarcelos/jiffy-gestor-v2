import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * GET /api/perfis-pdv/[id]
 * Busca um perfil PDV específico pelo ID
 */
export async function GET(
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
      return NextResponse.json({ error: 'ID do perfil PDV é obrigatório' }, { status: 400 })
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jiffy-backend-hom.nexsyn.com.br/api/v1'
    const response = await fetch(`${apiUrl}/pessoas/perfis-pdv/${id}`, {
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Perfil PDV não encontrado' }, { status: 404 })
      }
      throw new Error('Erro ao buscar perfil PDV')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar perfil PDV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar perfil PDV' },
      { status: 500 }
    )
  }
}

