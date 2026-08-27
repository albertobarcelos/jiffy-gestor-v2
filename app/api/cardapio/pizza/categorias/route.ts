import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
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

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const result = await repo.listarCategorias(pagination)

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

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const categoria = await repo.criarCategoria(parsed.data)

    return pizzaJsonData(categoria, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao criar categoria de pizza')
  }
}