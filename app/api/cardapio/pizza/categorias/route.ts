import { NextRequest, NextResponse } from 'next/server'
import { createPizzaRepository } from '@/src/infrastructure/api/repositories/createPizzaRepository'
import {
  CriarPizzaCategoriaUseCase,
  ListarPizzaCategoriasUseCase,
} from '@/src/application/use-cases/pizza/PizzaCrudUseCases'
import { createCategoriaPizzaSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  parsePizzaPagination,
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonPaginated,
} from '@/src/shared/utils/pizzaApiRoute'

/** GET /api/cardapio/pizza/categorias */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { searchParams } = new URL(req.url)
    const pagination = parsePizzaPagination(searchParams)

    const result = await new ListarPizzaCategoriasUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(pagination)

    return pizzaJsonPaginated(result)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao listar categorias de pizza')
  }
}

/** POST /api/cardapio/pizza/categorias */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const parsed = createCategoriaPizzaSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const categoria = await new CriarPizzaCategoriaUseCase(
      createPizzaRepository(validation.tokenInfo.token)
    ).execute(parsed.data)

    return pizzaJsonData(categoria, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao criar categoria de pizza')
  }
}