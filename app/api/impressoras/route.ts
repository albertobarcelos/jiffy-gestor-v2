import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ImpressoraRepository } from '@/src/infrastructure/database/repositories/ImpressoraRepository'
import { BuscarImpressorasUseCase } from '@/src/application/use-cases/impressoras/BuscarImpressorasUseCase'
import { CriarImpressoraUseCase } from '@/src/application/use-cases/impressoras/CriarImpressoraUseCase'
import { CriarImpressoraSchema } from '@/src/application/dto/CriarImpressoraDTO'

/**
 * GET /api/impressoras
 * Lista impressoras com paginação e busca
 */
export async function GET(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const q = searchParams.get('q') || ''

    const repository = new ImpressoraRepository(undefined, tokenInfo.token)
    const useCase = new BuscarImpressorasUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
    })

    return NextResponse.json({
      items: result.impressoras.map((i) => i.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar impressoras:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar impressoras' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/impressoras
 * Cria uma nova impressora
 */
export async function POST(request: NextRequest) {
  try {
    const validation = validateRequest(request)
    if (!validation.valid || !validation.tokenInfo) {
      return validation.error!
    }
    const { tokenInfo } = validation

    const body = await request.json()

    // Validação com Zod
    const validatedData = CriarImpressoraSchema.parse(body)

    const repository = new ImpressoraRepository(undefined, tokenInfo.token)
    const useCase = new CriarImpressoraUseCase(repository)

    const impressora = await useCase.execute(validatedData)

    return NextResponse.json(impressora.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar impressora:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar impressora' },
      { status: 500 }
    )
  }
}
