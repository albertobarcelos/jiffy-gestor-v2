import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import { MSG_SEM_DADOS_PECA_TAMBEM } from '@/src/shared/types/relatorioPecaTambemApi'

const UPSTREAM_PATH = '/api/v1/relatorios/peca-tambem'

/**
 * GET /api/relatorios/peca-tambem?de=&ate=&q=
 * Proxy JWT → relatório Peça Também (resumo + ranking).
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { searchParams } = new URL(request.url)
    const de = searchParams.get('de')?.trim()
    const ate = searchParams.get('ate')?.trim()
    const q = searchParams.get('q')?.trim()
    if (!de || !ate) {
      return NextResponse.json(
        { error: 'Parâmetros de e ate são obrigatórios' },
        { status: 400 }
      )
    }

    const qs = new URLSearchParams({ de, ate })
    if (q) qs.set('q', q)
    const apiClient = new ApiClient()
    const response = await apiClient.request<Record<string, unknown>>(
      `${UPSTREAM_PATH}?${qs.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${validation.tokenInfo.token}` },
      }
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Erro ao buscar relatório Peça Também:', error)
    if (error instanceof ApiError) {
      const status =
        error.status >= 400 && error.status < 600 ? error.status : 502
      const mensagemBruta = mensagemLegivelApiError(error)
      const lower = mensagemBruta.toLowerCase()
      const mensagem =
        status === 404 || lower.includes('not found') || /^erro\s*404\b/.test(lower)
          ? MSG_SEM_DADOS_PECA_TAMBEM
          : mensagemBruta
      return NextResponse.json(
        { error: mensagem, details: error.data },
        { status }
      )
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro ao buscar relatório Peça Também',
      },
      { status: 500 }
    )
  }
}
