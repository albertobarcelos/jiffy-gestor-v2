import { NextRequest, NextResponse } from 'next/server'
import { ReordenarGrupoProdutoUseCase } from '@/src/application/use-cases/grupos-produtos/ReordenarGrupoProdutoUseCase'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * PATCH - Reordenar grupo de produtos
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
    const { tokenInfo } = validation

    const { id } = await params
    const body = await req.json()
    const novaPosicao = body.novaPosicao

    if (!novaPosicao || novaPosicao < 1) {
      return NextResponse.json(
        { message: 'Nova posição inválida' },
        { status: 400 }
      )
    }

    const apiClient = new ApiClient()
    const repository = new GrupoProdutoRepository(apiClient, tokenInfo.token)
    const useCase = new ReordenarGrupoProdutoUseCase(repository)

    await useCase.execute(id, novaPosicao)

    return NextResponse.json({ success: true, message: 'Ordem atualizada com sucesso' })
  } catch (error: any) {
    console.error('Erro na API de reordenar grupo:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

