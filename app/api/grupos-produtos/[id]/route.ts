import { NextRequest, NextResponse } from 'next/server'
import { AtualizarGrupoProdutoUseCase } from '@/src/application/use-cases/grupos-produtos/AtualizarGrupoProdutoUseCase'
import { ReordenarGrupoProdutoUseCase } from '@/src/application/use-cases/grupos-produtos/ReordenarGrupoProdutoUseCase'
import { GrupoProdutoRepository } from '@/src/infrastructure/database/repositories/GrupoProdutoRepository'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { validateRequest } from '@/src/shared/utils/validateRequest'

/**
 * GET - Buscar grupo por ID
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
    const grupo = await repository.buscarGrupoPorId(id)

    if (!grupo) {
      return NextResponse.json({ message: 'Grupo não encontrado' }, { status: 404 })
    }

    return NextResponse.json(grupo.toJSON())
  } catch (error: any) {
    console.error('Erro na API de buscar grupo:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * PATCH - Atualizar grupo de produtos
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

    const apiClient = new ApiClient()
    const repository = new GrupoProdutoRepository(apiClient, tokenInfo.token)
    const useCase = new AtualizarGrupoProdutoUseCase(repository)

    const grupo = await useCase.execute(id, {
      nome: body.nome,
      ativo: body.ativo,
      corHex: body.corHex,
      iconName: body.iconName,
      ativoDelivery: body.ativoDelivery,
      ativoLocal: body.ativoLocal,
    })

    return NextResponse.json({ success: true, data: grupo.toJSON() })
  } catch (error: any) {
    console.error('Erro na API de atualizar grupo:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

/**
 * DELETE - Deletar grupo de produtos
 */
export async function DELETE(
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
    await repository.deletarGrupo(id)

    return NextResponse.json({ success: true, message: 'Grupo deletado com sucesso' })
  } catch (error: any) {
    console.error('Erro na API de deletar grupo:', error)
    return NextResponse.json(
      { message: error.message || 'Erro interno do servidor' },
      { status: error.status || 500 }
    )
  }
}

