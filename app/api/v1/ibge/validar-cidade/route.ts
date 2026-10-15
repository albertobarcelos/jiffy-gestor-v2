import { NextRequest, NextResponse } from 'next/server'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'
import { localizarMunicipioNoEstado } from '@/src/infrastructure/ibge/ibgeLocalidadesClient'

/**
 * GET /api/v1/ibge/validar-cidade?cidade=São Paulo&uf=SP
 * Valida cidade no catálogo local do Gestor.
 */
export async function GET(request: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(request)
    if (!tokenInfo) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cidade = searchParams.get('cidade')?.trim()
    const uf = searchParams.get('uf')?.trim()

    if (!cidade || cidade.length < 2) {
      return NextResponse.json(
        { error: 'Cidade deve ter pelo menos 2 caracteres' },
        { status: 400 }
      )
    }

    if (!uf || uf.length !== 2) {
      return NextResponse.json({ error: 'UF deve ter 2 caracteres' }, { status: 400 })
    }

    const municipio = localizarMunicipioNoEstado(cidade, uf)

    return NextResponse.json({
      valido: Boolean(municipio),
      cidade,
      uf: uf.toUpperCase(),
      codigoCidadeIbge: municipio?.codigoCidadeIbge ?? null,
      nomeCidade: municipio?.nomeCidade ?? null,
    })
  } catch (error) {
    console.error('Erro ao validar cidade:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro interno ao validar cidade',
      },
      { status: 500 }
    )
  }
}
