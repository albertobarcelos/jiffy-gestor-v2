import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * GET /api/perfis-pdv
 * Lista perfis PDV para uso em dropdowns
 * Suporta paginação com limit e offset
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'
    const offset = searchParams.get('offset') || '0'

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jiffy-backend-hom.nexsyn.com.br/api/v1'
    const url = `${apiUrl}/pessoas/perfis-pdv?limit=${limit}&offset=${offset}`
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokenInfo.token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Erro ao buscar perfis PDV')
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar perfis PDV:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar perfis PDV' },
      { status: 500 }
    )
  }
}

