import { NextRequest, NextResponse } from 'next/server'
import { ReordenarPizzaSaborUseCase } from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import { reorderSaborPizzaSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { pizzaApiErrorResponse, pizzaJsonData } from '@/src/shared/utils/pizzaApiRoute'

type RouteContext = { params: Promise<{ id: string }> }

/** PATCH /api/cardapio/pizza/sabores/:id/reordena-sabor */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { id } = await params
    const body = await req.json()
    const parsed = reorderSaborPizzaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const sabor = await new ReordenarPizzaSaborUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(id, parsed.data.novaPosicao)

    return pizzaJsonData(sabor)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao reordenar sabor de pizza')
  }
}