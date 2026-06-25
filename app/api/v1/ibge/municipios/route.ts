import { NextRequest, NextResponse } from 'next/server'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'
import { listarMunicipiosPorEstado } from '@/src/infrastructure/ibge/ibgeLocalidadesClient'

/**
 * GET /api/v1/ibge/municipios?uf=SP
 * Lista todos os municípios de um estado (API pública do IBGE).
 */
export async function GET(request: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(request)
    if (!tokenInfo) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uf = searchParams.get('uf')?.trim()

    if (!uf || uf.length !== 2) {
      return NextResponse.json({ error: 'UF é obrigatório e deve ter 2 caracteres' }, { status: 400 })
    }

    const municipios = await listarMunicipiosPorEstado(uf)

    return NextResponse.json({
      uf: uf.toUpperCase(),
      municipios,
      total: municipios.length,
    })
  } catch (error) {
    console.error('Erro ao listar municípios:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro interno ao listar municípios',
      },
      { status: 500 }
    )
  }
}
