import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ClienteRepository } from '@/src/infrastructure/database/repositories/ClienteRepository'
import { BuscarClientesUseCase } from '@/src/application/use-cases/clientes/BuscarClientesUseCase'
import { CriarClienteUseCase } from '@/src/application/use-cases/clientes/CriarClienteUseCase'
import { CriarClienteSchema } from '@/src/application/dto/CriarClienteDTO'

/**
 * GET /api/clientes
 * Lista clientes com paginação, busca e filtro
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

    const repository = new ClienteRepository(undefined, tokenInfo.token)
    const useCase = new BuscarClientesUseCase(repository)

    const result = await useCase.execute({
      limit,
      offset,
      q,
      ativo,
    })

    return NextResponse.json({
      items: result.clientes.map((c) => c.toJSON()),
      count: result.total,
    })
  } catch (error) {
    console.error('Erro ao buscar clientes:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar clientes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/clientes
 * Cria um novo cliente
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
    const validatedData = CriarClienteSchema.parse(body)

    const repository = new ClienteRepository(undefined, tokenInfo.token)
    const useCase = new CriarClienteUseCase(repository)

    const cliente = await useCase.execute(validatedData)

    return NextResponse.json(cliente.toJSON(), { status: 201 })
  } catch (error) {
    console.error('Erro ao criar cliente:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}

