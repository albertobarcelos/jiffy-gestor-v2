import { NextRequest, NextResponse } from 'next/server'
import { CriarPizzaCategoriaCompletoUseCase } from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import { createCategoriaPizzaCompletoSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import { pizzaApiErrorResponse, pizzaJsonData } from '@/src/shared/utils/pizzaApiRoute'

/** POST /api/cardapio/pizza/categorias/completo */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const parsed = createCategoriaPizzaCompletoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const categoria = await new CriarPizzaCategoriaCompletoUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(parsed.data)

    return pizzaJsonData(categoria, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao criar categoria de pizza completa')
  }
}