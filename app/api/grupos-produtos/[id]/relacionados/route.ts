import { NextRequest, NextResponse } from 'next/server'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * GET - Lista produtos relacionados (Peça Também) do grupo
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { id } = await params

    const apiClient = new ApiClient()
    const repository = new GrupoProdutoRepository(apiClient, tokenInfo.token)
    const relacionados = await repository.listarProdutosRelacionados(id)

    return NextResponse.json({ relacionados })
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number }
    console.error('Erro ao listar produtos relacionados do grupo:', error)
    return NextResponse.json(
      { message: err.message || 'Erro interno do servidor' },
      { status: err.status || 500 }
    )
  }
}

/**
 * PUT - Substitui produtos relacionados do grupo
 * Body: { produtoIds: string[] }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation
    const { id } = await params
    const body = await req.json()
    const produtoIds = Array.isArray(body?.produtoIds)
      ? body.produtoIds.filter((x: unknown): x is string => typeof x === 'string')
      : null

    if (!produtoIds) {
      return NextResponse.json(
        { message: 'produtoIds deve ser um array de strings' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const repository = new GrupoProdutoRepository(apiClient, tokenInfo.token)
    await repository.substituirProdutosRelacionados(id, produtoIds)

    return new NextResponse(null, { status: 204 })
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number }
    console.error('Erro ao atualizar produtos relacionados do grupo:', error)
    return NextResponse.json(
      { message: err.message || 'Erro interno do servidor' },
      { status: err.status || 500 }
    )
  }
}
