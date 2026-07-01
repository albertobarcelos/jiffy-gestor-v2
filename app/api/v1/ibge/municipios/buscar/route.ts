import { NextRequest, NextResponse } from 'next/server'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'
import { buscarMunicipiosPorNome } from '@/src/infrastructure/ibge/ibgeLocalidadesClient'

/**
 * GET /api/v1/ibge/municipios/buscar?uf=SP&nome=São
 * Busca municípios por nome (autocomplete) via API pública do IBGE.
 */
export async function GET(request: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(request)
    if (!tokenInfo) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const uf = searchParams.get('uf')?.trim()
    const nome = searchParams.get('nome')?.trim()

    if (!uf || uf.length !== 2) {
      return NextResponse.json({ error: 'UF é obrigatório e deve ter 2 caracteres' }, { status: 400 })
    }

    if (!nome || nome.length < 2) {
      return NextResponse.json(
        { error: 'Nome deve ter pelo menos 2 caracteres' },
        { status: 400 }
      )
    }

    const { municipios, total, limitado } = await buscarMunicipiosPorNome(uf, nome)

    return NextResponse.json({
      uf: uf.toUpperCase(),
      query: nome,
      municipios,
      total,
      limitado,
    })
  } catch (error) {
    console.error('Erro ao buscar municípios:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro interno ao buscar municípios',
      },
      { status: 500 }
    )
  }
}
