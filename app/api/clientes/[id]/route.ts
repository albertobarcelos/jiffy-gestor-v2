import { NextRequest, NextResponse } from 'next/server'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { ClienteRepository } from '@/src/infrastructure/database/repositories/ClienteRepository'
import { BuscarClientePorIdUseCase } from '@/src/application/use-cases/clientes/BuscarClientePorIdUseCase'
import { AtualizarClienteUseCase } from '@/src/application/use-cases/clientes/AtualizarClienteUseCase'
import { AtualizarClienteSchema } from '@/src/application/dto/AtualizarClienteDTO'

/**
 * GET /api/clientes/[id]
 * Busca um cliente por ID
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
      return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 })
    }

    const repository = new ClienteRepository(undefined, tokenInfo.token)
    const useCase = new BuscarClientePorIdUseCase(repository)

    const cliente = await useCase.execute(id)

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    return NextResponse.json(cliente.toJSON())
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/clientes/[id]
 * Atualiza um cliente
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
      return NextResponse.json({ error: 'ID do cliente é obrigatório' }, { status: 400 })
    }

    const body = await request.json()

    console.log('📥 API Route - Dados recebidos:', {
      id,
      cpfNoBody: body.cpf,
      cpfType: typeof body.cpf,
      cpfInBody: 'cpf' in body,
      bodyCompleto: JSON.stringify(body, null, 2),
    })

    // Validação com Zod (partial - todos os campos são opcionais)
    const validatedData = AtualizarClienteSchema.parse(body)

    console.log('📥 API Route - Dados após validação Zod:', {
      cpfNoValidated: validatedData.cpf,
      cpfType: typeof validatedData.cpf,
      cpfInValidated: 'cpf' in validatedData,
      validatedCompleto: JSON.stringify(validatedData, null, 2),
    })

    const repository = new ClienteRepository(undefined, tokenInfo.token)
    const useCase = new AtualizarClienteUseCase(repository)

    const cliente = await useCase.execute(id, validatedData)

    return NextResponse.json(cliente.toJSON())
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error)
    
    if (error instanceof Error && error.message.includes('ZodError')) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}

