import { NextRequest, NextResponse } from 'next/server'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  AtualizarPizzaSaborUseCase,
  BuscarPizzaSaborUseCase,
  ExcluirPizzaSaborUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { updateSaborPizzaSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonOk,
} from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** GET /api/cardapio/pizza/sabores/:id */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const sabor = await new BuscarPizzaSaborUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonData(sabor)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao buscar sabor de pizza')
  }
}

/** PATCH /api/cardapio/pizza/sabores/:id */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const parsed = updateSaborPizzaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const sabor = await new AtualizarPizzaSaborUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id, parsed.data)

    return pizzaJsonData(sabor)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao atualizar sabor de pizza')
  }
}

/** DELETE /api/cardapio/pizza/sabores/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    await new ExcluirPizzaSaborUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao excluir sabor de pizza')
  }
}