import { NextRequest, NextResponse } from 'next/server'
import { buscarCatalogoProdutoIndexUseCase } from '@/src/application/use-cases/produtos/BuscarCatalogoProdutoIndexUseCase'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { getTokenInfo } from '@/src/shared/utils/getTokenInfo'

/**
 * GET — Índice slim do cadastro (id → código + flags de permissão).
 * Paginação no servidor; resposta única e leve para a tela de cardápio.
 */
export async function GET(req: NextRequest) {
  try {
    const tokenInfo = getTokenInfo(req)
    if (!tokenInfo) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 })
    }
    if (!tokenInfo.empresaId) {
      return NextResponse.json({ message: 'Empresa não identificada no token' }, { status: 401 })
    }

    const index = await buscarCatalogoProdutoIndexUseCase.execute(tokenInfo.token)

    return NextResponse.json(
      {
        success: true,
        codigos: index.codigos,
        permissoes: index.permissoes,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: unknown) {
    console.error('Erro na API catalogo-index:', error)

    if (
      error instanceof ApiError &&
      error.status === 504 &&
      error.data &&
      typeof error.data === 'object' &&
      'timeout' in error.data &&
      (error.data as { timeout?: boolean }).timeout
    ) {
      return NextResponse.json(
        {
          success: true,
          codigos: {},
          permissoes: {},
          warning: 'O serviço está temporariamente indisponível.',
        },
        { status: 200 }
      )
    }

    if (error instanceof ApiError) {
      return NextResponse.json(
        { message: error.message || 'Erro ao carregar índice de produtos' },
        { status: error.status }
      )
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Erro interno do servidor',
      },
      { status: 500 }
    )
  }
}
