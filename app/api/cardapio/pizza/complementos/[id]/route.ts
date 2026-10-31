import { NextRequest, NextResponse } from 'next/server'
import { DesvincularPizzaComplementoUseCase } from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  pizzaApiErrorResponse,
  pizzaJsonOk,
} from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** DELETE /api/cardapio/pizza/complementos/:id */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    if (!id) {
      return NextResponse.json({ message: 'Id obrigatório' }, { status: 400 })
    }

    await new DesvincularPizzaComplementoUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id)

    return pizzaJsonOk()
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao desvincular adicional da categoria')
  }
}
