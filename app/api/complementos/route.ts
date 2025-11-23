import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ComplementoRepository } from '@/src/infrastructure/database/repositories/ComplementoRepository'
import { BuscarComplementosUseCase } from '@/src/application/use-cases/complementos/BuscarComplementosUseCase'
import { CriarComplementoUseCase } from '@/src/application/use-cases/complementos/CriarComplementoUseCase'
import { CriarComplementoSchema } from '@/src/application/dto/CriarComplementoDTO'

/**
 * GET /api/complementos
 * Lista complementos com paginação, busca e filtro
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
    const ativoParam = searchParams.get('ativo')
    const ativo = ativoParam !== null ? ativoParam === 'true' : null

    const repository = new ComplementoRepository(undefined, tokenInfo.token)
    const useCase = new BuscarComplementosUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
      ativo,
    })

    return NextResponse.json({
      items: result.complementos.map((c) => c.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar complementos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar complementos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/complementos
 * Cria um novo complemento
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
    const validatedData = CriarComplementoSchema.parse(body)

    const repository = new ComplementoRepository(undefined, tokenInfo.token)
    const useCase = new CriarComplementoUseCase(repository)

    const complemento = await useCase.execute(validatedData)

    return NextResponse.json(complemento.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar complemento:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar complemento' },
      { status: 500 }
    )
  }
}

