import { NextRequest, NextResponse } from 'next/server'
import { ApiClient } from '@/src/infrastructure/api/apiClient'
import { PizzaRepository } from '@/src/infrastructure/database/repositories/PizzaRepository'
import { createPizzaTamanhoSchema } from '@/src/application/dto/pizza/PizzaInputSchemas'
import { validateRequest } from '@/src/shared/utils/validateRequest'
import {
  parsePizzaPagination,
  pizzaApiErrorResponse,
  pizzaJsonData,
  pizzaJsonPaginated,
} from '@/src/shared/utils/pizzaApiRoute'

/** GET /api/cardapio/pizza/tamanhos */
export async function GET(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const { searchParams } = new URL(req.url)
    const pagination = parsePizzaPagination(searchParams)
    const categoriaPizzaId = searchParams.get('categoriaPizzaId') || undefined

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const result = await repo.listarTamanhos({ ...pagination, categoriaPizzaId })

    return pizzaJsonPaginated(result)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao listar tamanhos de pizza')
  }
}

/** POST /api/cardapio/pizza/tamanhos */
export async function POST(req: NextRequest) {
  try {
    const validation = validateRequest(req)
    if (!validation.valid || !validation.tokenInfo) return validation.error!

    const body = await req.json()
    const parsed = createPizzaTamanhoSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message ?? 'Dados invalidos' },
        { status: 400 }
      )
    }

    const repo = new PizzaRepository(new ApiClient(), validation.tokenInfo.token)
    const tamanho = await repo.criarTamanho(parsed.data)

    return pizzaJsonData(tamanho, 201)
  } catch (error) {
    return pizzaApiErrorResponse(error, 'Erro ao criar tamanho de pizza')
  }
}