import { NextRequest, NextResponse } from 'next/server'
import { AtualizarMenusProdutoUseCase } from '@/src/application/use-cases/produtos/AtualizarMenusProdutoUseCase'
import { ProdutoRepository } from '@/src/infrastructure/database/repositories/ProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * PATCH /api/produtos/:id/menus — add / remove vínculos do produto com menus.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ message: 'Produto não informado' }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const apiClient = new ApiClient()
    const produtoRepository = new ProdutoRepository(apiClient, validation.tokenInfo.token)
    const useCase = new AtualizarMenusProdutoUseCase(produtoRepository)
    const produto = await useCase.execute(id, {
      add: body.add,
      remove: body.remove,
    })

    return NextResponse.json({ success: true, data: produto.toJSON() })
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number }
    console.error('Erro ao atualizar menus do produto:', error)
    return NextResponse.json(
      { message: err?.message || 'Erro ao atualizar menus do produto' },
      { status: err?.status || 500 }
    )
  }
}
