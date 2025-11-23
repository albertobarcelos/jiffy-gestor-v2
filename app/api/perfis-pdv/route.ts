import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * GET /api/perfis-pdv
 * Lista perfis PDV para uso em dropdowns
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://jiffy-backend-hom.nexsyn.com.br/api/v1'
    const response = await fetch(`${apiUrl}/pessoas/perfis-pdv`, {
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

