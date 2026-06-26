import { NextRequest, NextResponse } from 'next/server'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'
import { validarCidadeNoEstado } from '@/src/infrastructure/ibge/ibgeLocalidadesClient'

/**
 * GET /api/v1/ibge/validar-cidade?cidade=São Paulo&uf=SP
 * Valida se uma cidade existe no estado informado (API pública do IBGE).
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

    const valido = await validarCidadeNoEstado(cidade, uf)

    return NextResponse.json({
      valido,
      cidade,
      uf: uf.toUpperCase(),
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
