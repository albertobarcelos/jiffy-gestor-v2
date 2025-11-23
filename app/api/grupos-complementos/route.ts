import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { GrupoComplementoRepository } from '@/src/infrastructure/database/repositories/GrupoComplementoRepository'
import { BuscarGruposComplementosUseCase } from '@/src/application/use-cases/grupos-complementos/BuscarGruposComplementosUseCase'
import { CriarGrupoComplementoUseCase } from '@/src/application/use-cases/grupos-complementos/CriarGrupoComplementoUseCase'
import { CriarGrupoComplementoSchema } from '@/src/application/dto/CriarGrupoComplementoDTO'

/**
 * GET /api/grupos-complementos
 * Lista grupos de complementos com paginação, busca e filtro
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

    const repository = new GrupoComplementoRepository(undefined, tokenInfo.token)
    const useCase = new BuscarGruposComplementosUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
      ativo,
    })

    return NextResponse.json({
      items: result.grupos.map((g) => g.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar grupos de complementos:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar grupos de complementos' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/grupos-complementos
 * Cria um novo grupo de complementos
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
    const validatedData = CriarGrupoComplementoSchema.parse(body)

    const repository = new GrupoComplementoRepository(undefined, tokenInfo.token)
    const useCase = new CriarGrupoComplementoUseCase(repository)

    const grupo = await useCase.execute(validatedData)

    return NextResponse.json(grupo.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar grupo de complementos:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar grupo de complementos' },
      { status: 500 }
    )
  }
}
