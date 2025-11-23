import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { GrupoComplementoRepository } from '@/src/infrastructure/database/repositories/GrupoComplementoRepository'
import { BuscarGrupoComplementoPorIdUseCase } from '@/src/application/use-cases/grupos-complementos/BuscarGrupoComplementoPorIdUseCase'
import { AtualizarGrupoComplementoUseCase } from '@/src/application/use-cases/grupos-complementos/AtualizarGrupoComplementoUseCase'
import { DeletarGrupoComplementoUseCase } from '@/src/application/use-cases/grupos-complementos/DeletarGrupoComplementoUseCase'
import { AtualizarGrupoComplementoSchema } from '@/src/application/dto/AtualizarGrupoComplementoDTO'

/**
 * GET /api/grupos-complementos/[id]
 * Busca um grupo de complementos por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID do grupo de complementos é obrigatório' }, { status: 400 })
    }

    const repository = new GrupoComplementoRepository(undefined, tokenInfo.token)
    const useCase = new BuscarGrupoComplementoPorIdUseCase(repository)

    const grupo = await useCase.execute(id)

    if (!grupo) {
      return NextResponse.json({ error: 'Grupo de complementos não encontrado' }, { status: 404 })
    }

    return NextResponse.json(grupo.toJSON())
  } catch (error) {
    console.error('Erro ao buscar grupo de complementos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar grupo de complementos' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/grupos-complementos/[id]
 * Atualiza um grupo de complementos
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID do grupo de complementos é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarGrupoComplementoSchema.parse(body)

    const repository = new GrupoComplementoRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarGrupoComplementoUseCase(repository)

    const grupo = await useCase.execute(id, validatedData)

    return NextResponse.json(grupo.toJSON())
  } catch (error) {
    console.error('Erro ao atualizar grupo de complementos:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar grupo de complementos' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/grupos-complementos/[id]
 * Deleta um grupo de complementos
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID do grupo de complementos é obrigatório' }, { status: 400 })
    }

    const repository = new GrupoComplementoRepository(undefined, tokenInfo.token)
    const useCase = new DeletarGrupoComplementoUseCase(repository)

    await useCase.execute(id)

    return NextResponse.json({ message: 'Grupo de complementos deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar grupo de complementos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar grupo de complementos' },
      { status: 500 }
    )
  }
}

