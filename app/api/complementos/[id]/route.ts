import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ComplementoRepository } from '@/src/infrastructure/database/repositories/ComplementoRepository'
import { BuscarComplementoPorIdUseCase } from '@/src/application/use-cases/complementos/BuscarComplementoPorIdUseCase'
import { AtualizarComplementoUseCase } from '@/src/application/use-cases/complementos/AtualizarComplementoUseCase'
import { DeletarComplementoUseCase } from '@/src/application/use-cases/complementos/DeletarComplementoUseCase'
import { AtualizarComplementoSchema } from '@/src/application/dto/AtualizarComplementoDTO'

/**
 * GET /api/complementos/[id]
 * Busca um complemento por ID
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
      return NextResponse.json({ error: 'ID do complemento é obrigatório' }, { status: 400 })
    }

    const repository = new ComplementoRepository(undefined, tokenInfo.token)
    const useCase = new BuscarComplementoPorIdUseCase(repository)

    const complemento = await useCase.execute(id)

    if (!complemento) {
      return NextResponse.json({ error: 'Complemento não encontrado' }, { status: 404 })
    }

    return NextResponse.json(complemento.toJSON())
  } catch (error) {
    console.error('Erro ao buscar complemento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar complemento' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/complementos/[id]
 * Atualiza um complemento
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
      return NextResponse.json({ error: 'ID do complemento é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarComplementoSchema.parse(body)

    const repository = new ComplementoRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarComplementoUseCase(repository)

    const complemento = await useCase.execute(id, validatedData)

    return NextResponse.json(complemento.toJSON())
  } catch (error) {
    console.error('Erro ao atualizar complemento:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar complemento' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/complementos/[id]
 * Deleta um complemento
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
      return NextResponse.json({ error: 'ID do complemento é obrigatório' }, { status: 400 })
    }

    const repository = new ComplementoRepository(undefined, tokenInfo.token)
    const useCase = new DeletarComplementoUseCase(repository)

    await useCase.execute(id)

    return NextResponse.json({ message: 'Complemento deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar complemento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar complemento' },
      { status: 500 }
    )
  }
}

