import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ImpressoraRepository } from '@/src/infrastructure/database/repositories/ImpressoraRepository'
import { BuscarImpressoraPorIdUseCase } from '@/src/application/use-cases/impressoras/BuscarImpressoraPorIdUseCase'
import { AtualizarImpressoraUseCase } from '@/src/application/use-cases/impressoras/AtualizarImpressoraUseCase'
import { DeletarImpressoraUseCase } from '@/src/application/use-cases/impressoras/DeletarImpressoraUseCase'
import { AtualizarImpressoraSchema } from '@/src/application/dto/AtualizarImpressoraDTO'

/**
 * GET /api/impressoras/[id]
 * Busca uma impressora por ID
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
      return NextResponse.json({ error: 'ID da impressora é obrigatório' }, { status: 400 })
    }

    const repository = new ImpressoraRepository(undefined, tokenInfo.token)
    const useCase = new BuscarImpressoraPorIdUseCase(repository)

    const impressora = await useCase.execute(id)

    if (!impressora) {
      return NextResponse.json({ error: 'Impressora não encontrada' }, { status: 404 })
    }

    return NextResponse.json(impressora.toJSON())
  } catch (error) {
    console.error('Erro ao buscar impressora:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar impressora' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/impressoras/[id]
 * Atualiza uma impressora
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
      return NextResponse.json({ error: 'ID da impressora é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarImpressoraSchema.parse(body)

    const repository = new ImpressoraRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarImpressoraUseCase(repository)

    const impressora = await useCase.execute(id, validatedData)

    return NextResponse.json(impressora.toJSON())
  } catch (error) {
    console.error('Erro ao atualizar impressora:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar impressora' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/impressoras/[id]
 * Deleta uma impressora
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
      return NextResponse.json({ error: 'ID da impressora é obrigatório' }, { status: 400 })
    }

    const repository = new ImpressoraRepository(undefined, tokenInfo.token)
    const useCase = new DeletarImpressoraUseCase(repository)

    await useCase.execute(id)

    return NextResponse.json({ message: 'Impressora deletada com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar impressora:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao deletar impressora' },
      { status: 500 }
    )
  }
}

